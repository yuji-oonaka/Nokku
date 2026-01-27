import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { EventStackParamList } from '../../navigators/EventStackNavigator';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SoundService from '../../services/SoundService';
import { Event, TicketType, fetchEventDetailData } from '../../api/queries';

// 分離したコンポーネントをインポート
import TicketPurchaseList from './components/TicketPurchaseList';
import EventAdminMenu from './components/EventAdminMenu';
import { useEventChatApi } from './hooks/useEventChatApi';

type EventDetailScreenRouteProp = RouteProp<EventStackParamList, 'EventDetail'>;

const EventDetailScreen: React.FC = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation<any>();
  const route = useRoute<EventDetailScreenRouteProp>();
  const eventId = route.params?.eventId;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [buyingTicketId, setBuyingTicketId] = useState<number | null>(null);
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // ▼▼▼ 購入フロー用ステート追加 ▼▼▼
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: () => fetchEventDetailData(eventId!),
    enabled: !!eventId,
  });

  const event: Event | undefined = data?.event;
  const tickets: TicketType[] = data?.tickets || [];

  // 過去イベント判定
  const isFinished = event
    ? new Date().getTime() > new Date(event.event_date).getTime()
    : false;
  const isAdminOrOwner =
    user && event
      ? user.id === event.artist_id || user.role === 'admin'
      : false;
  // --- Actions ---

  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true);
    await refetch().catch(() => {});
    setIsManualRefetching(false);
  }, [refetch]);

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      Alert.alert('削除完了', `「${event?.title}」を削除しました。`);
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        'エラー',
        error.response?.data?.message || 'イベントの削除に失敗しました',
      );
    },
  });

  const deleteTicketTypeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/ticket-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', eventId] });
      Alert.alert('削除完了', '券種を削除しました。');
    },
    onError: (error: any) => {
      Alert.alert(
        'エラー',
        error.response?.data?.message || '券種の削除に失敗しました',
      );
    },
  });

  /**
   * 1. チケット選択時 (モーダルを表示)
   */
  const handleSelectTicket = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setPurchaseQuantity(1);
    setShowConfirmModal(true);
    SoundService.triggerHaptic('impactLight');
  };

  const handleConfirmPurchase = async () => {
    if (!selectedTicket) return;

    setShowConfirmModal(false); // モーダルを閉じる
    setBuyingTicketId(selectedTicket.id);
    SoundService.triggerHaptic('impactMedium');

    try {
      // ★ 重要: 旧 create-ticket-payment-intent ではなく /orders を使用
      const response = await api.post('/orders', {
        ticket_type_id: selectedTicket.id, // ★ ticket_id から修正
        quantity: purchaseQuantity,
        payment_method: 'stripe',
        delivery_method: 'venue', // チケットは会場入場のため venue 固定
      });

      const { clientSecret } = response.data;
      if (!clientSecret) throw new Error('決済の準備に失敗しました');

      // Stripe Payment Sheet の初期化 [cite: 256]
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU, Inc.',
        paymentIntentClientSecret: clientSecret,
      });
      if (initError) throw new Error(initError.message);

      // 決済の実行 [cite: 257]
      const { error: presentError } = await presentPaymentSheet({});
      if (presentError) {
        if (presentError.code !== 'Canceled')
          Alert.alert('決済エラー', presentError.message);
        setBuyingTicketId(null);
        return;
      }

      // ★ 修正: Webhook側で UserTicket を発行するため、フロントからの confirm-ticket-purchase は不要。
      SoundService.playSuccess();
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      queryClient.invalidateQueries({ queryKey: ['eventDetail', eventId] });
      setBuyingTicketId(null);

      Alert.alert(
        '注文完了',
        `「${selectedTicket.name}」を ${purchaseQuantity} 枚注文しました。\n決済完了後、マイチケットに発行されます。`,
        [
          {
            text: 'マイチケットを見る',
            onPress: () =>
              navigation.navigate('MyPageStack', { screen: 'MyTickets' }),
          },
          { text: '閉じる', style: 'cancel' },
        ],
      );
    } catch (error: any) {
      SoundService.playError();
      const message =
        error.response?.data?.message ||
        error.message ||
        '購入処理に失敗しました。';
      Alert.alert('エラー', message);
      setBuyingTicketId(null);
    }
  };

  const handleDeleteEvent = () => {
    if (!event) return;
    Alert.alert(
      'イベント削除',
      '本当に削除しますか？\n関連データも削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => deleteEventMutation.mutate(event.id),
        },
      ],
    );
  };

  const handleDeleteTicketType = (ticketType: TicketType) => {
    if (buyingTicketId !== null) return;
    Alert.alert('券種の削除', `「${ticketType.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => deleteTicketTypeMutation.mutate(ticketType.id),
      },
    ]);
  };

  if (isLoading) return <LoadingView />;
  if (isError || !data || !event)
    return <ErrorView onRetry={() => refetch()} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* ヘッダー画像 */}
        <Image
          source={{ uri: event.image_url || undefined }}
          style={[
            styles.eventImage,
            !event.image_url && styles.imagePlaceholder,
          ]}
        />

        <View style={styles.detailCard}>
          {isFinished && (
            <View style={styles.finishedBadge}>
              <Text style={styles.finishedText}>
                このイベントは終了しました
              </Text>
            </View>
          )}

          <Text style={styles.title}>{event.title}</Text>

          {/* 主催者情報 */}
          {event.artist && (
            <View style={styles.organizerRow}>
              <Image
                source={{ uri: event.artist.image_url || undefined }}
                style={[
                  styles.organizerAvatar,
                  !event.artist.image_url && styles.avatarPlaceholder,
                ]}
              />
              <Text style={styles.organizerName}>
                主催: {event.artist.nickname}
              </Text>
            </View>
          )}

          {/* メタ情報 */}
          <MetaRow
            label="📅 日時:"
            value={new Date(event.event_date).toLocaleString('ja-JP')}
          />
          <MetaRow label="📍 会場:" value={event.venue} />

          <Text style={styles.description}>{event.description}</Text>
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => {
            SoundService.triggerHaptic('impactLight');

            navigation.navigate('EventChatLobby', {
              eventId: String(event.id),
              eventTitle: event.title,
            });
          }}
        >
          <Text style={styles.chatButtonText}>
            {/* テキストも変更して、新機能であることを明示 */}
            💬 イベントチャットに参加 (BETA)
          </Text>
        </TouchableOpacity>

        {/* ▼▼▼ 追加: お問い合わせボタン ▼▼▼ */}
        <TouchableOpacity
          style={styles.inquiryButton} // スタイルは後述
          onPress={() => {
            navigation.navigate('MyPageStack', {
              screen: 'InquiryCreate',
              params: {
                target_type: 'event',
                target_id: event.id,
                target_name: event.title,
              },
            });
          }}
        >
          <Text style={styles.inquiryButtonText}>📩 主催者に問い合わせる</Text>
        </TouchableOpacity>

        {!isFinished && (
          <>
            <View style={styles.ticketHeaderContainer}>
              <Text style={styles.ticketHeader}>チケットを選択</Text>
              {isAdminOrOwner && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('TicketTypeCreate', {
                      event_id: event.id,
                    })
                  }
                >
                  <Text style={styles.addButton}>＋ 券種を追加</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* チケットリストコンポーネント */}
            <TicketPurchaseList
              tickets={tickets}
              isAdminOrOwner={isAdminOrOwner}
              buyingTicketId={buyingTicketId}
              onBuy={handleSelectTicket} // ★ 修正: handleBuyTicket から handleSelectTicket へ
              onDelete={handleDeleteTicketType}
            />
          </>
        )}

        {/* 管理者メニューコンポーネント */}
        {isAdminOrOwner && (
          <EventAdminMenu
            isFinished={isFinished}
            onEdit={() =>
              navigation.navigate('EventEdit', { eventId: event.id })
            }
            onDelete={handleDeleteEvent}
          />
        )}
      </ScrollView>
      {/* ▼▼▼ 追加: 購入確認・枚数選択モーダル ▼▼▼ */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTicket?.name}</Text>
            <Text style={styles.modalPrice}>
              単価: ¥{selectedTicket?.price.toLocaleString()}
            </Text>

            <View style={styles.quantityRow}>
              <Text style={styles.modalLabel}>購入枚数 (最大10枚):</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  onPress={() =>
                    setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))
                  }
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{purchaseQuantity}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setPurchaseQuantity(Math.min(10, purchaseQuantity + 1))
                  }
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>合計金額:</Text>
              <Text style={styles.totalValue}>
                ¥
                {(
                  (selectedTicket?.price || 0) * purchaseQuantity
                ).toLocaleString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmPurchase}
            >
              <Text style={styles.confirmBtnText}>決済へ進む</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.cancelBtnText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// サブコンポーネント（ファイル内定義で十分なもの）
const LoadingView = () => (
  <SafeAreaView style={[styles.container, styles.center]}>
    <ActivityIndicator size="large" color="#FFFFFF" />
  </SafeAreaView>
);

const ErrorView = ({ onRetry }: { onRetry: () => void }) => (
  <SafeAreaView style={[styles.container, styles.center]}>
    <Text style={{ color: '#888', marginBottom: 20 }}>
      イベントの取得に失敗しました。
    </Text>
    <TouchableOpacity
      onPress={onRetry}
      style={{ padding: 10, backgroundColor: '#0A84FF', borderRadius: 8 }}
    >
      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>再試行</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metaRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  eventImage: { width: '100%', height: 220, resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: '#333' },
  detailCard: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    margin: 15,
    borderRadius: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 8,
  },
  organizerAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  avatarPlaceholder: { backgroundColor: '#555' },
  organizerName: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  metaRow: { flexDirection: 'row', marginBottom: 5 },
  label: { color: '#AAA', fontSize: 14, width: 60 },
  value: { color: '#FFF', fontSize: 14, flex: 1 },
  description: { fontSize: 15, color: '#DDD', marginTop: 15, lineHeight: 24 },
  finishedBadge: {
    backgroundColor: '#333',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#888',
  },
  finishedText: { color: '#BBB', fontSize: 12, fontWeight: 'bold' },
  ticketHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  ticketHeader: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  addButton: { fontSize: 16, color: '#0A84FF', fontWeight: 'bold' },
  chatButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  chatButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  // チャットボタンの下に追加するためのスタイル
  inquiryButton: {
    backgroundColor: '#333333', // 少し控えめなグレー
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20, // 下のマージン
    borderWidth: 1,
    borderColor: '#555',
  },
  inquiryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    padding: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalPrice: {
    color: '#4CAF50',
    fontSize: 18,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  modalLabel: { color: '#AAA', flex: 1, fontSize: 16 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#333',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: '#FFF', fontSize: 24 },
  qtyText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 20,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#333',
    paddingTop: 20,
    marginBottom: 30,
  },
  totalLabel: { color: '#FFF', fontSize: 18 },
  totalValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  confirmBtn: {
    backgroundColor: '#0A84FF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  cancelBtn: { padding: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 16 },
});

export default EventDetailScreen;
