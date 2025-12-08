import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal, // ★ 追加
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { EventStackParamList } from '../navigators/EventStackNavigator';
import api from '../services/api'; // createTicketPaymentIntentで直接使うため
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SoundService from '../services/SoundService';
import { Event, TicketType, fetchEventDetailData } from '../api/queries';
import { purchaseTicket } from '../api/ticketApi'; // API関数を直接インポート

type EventDetailScreenRouteProp = RouteProp<EventStackParamList, 'EventDetail'>;

const EventDetailScreen: React.FC = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation<any>();
  const route = useRoute<EventDetailScreenRouteProp>();
  const eventId = route.params?.eventId;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // ★ 購入モーダル用のState
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const { data, isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: () => fetchEventDetailData(eventId!),
    enabled: !!eventId,
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
    } catch (error) {}
    setIsManualRefetching(false);
  }, [refetch]);

  const event: Event | undefined = data?.event;
  const tickets: TicketType[] = data?.tickets || [];

  const eventDate = new Date(event?.event_date || 0);
  const now = new Date();
  const isFinished = now.getTime() > eventDate.getTime();

  const isAdminOrOwner =
    user && event && (user.id === event.artist_id || user.role === 'admin');

  // --- 削除系 Mutation ---
  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      Alert.alert('削除完了', `「${event?.title}」を削除しました。`);
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('エラー', error.response?.data?.message || '削除失敗');
    },
  });

  const deleteTicketTypeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/ticket-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDetail', eventId] });
      Alert.alert('削除完了', '券種を削除しました。');
    },
    onError: (error: any) => {
      Alert.alert('エラー', error.response?.data?.message || '削除失敗');
    },
  });

  // --- ★ 購入フロー開始 (モーダルを開く) ---
  const handleOpenPurchaseModal = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setQuantity(1);
    setModalVisible(true);
  };

  // --- ★ 決済実行ロジック ---
  const handleProcessPayment = async () => {
    if (!selectedTicket) return;
    setIsPurchasing(true);
    SoundService.triggerHaptic('impactMedium');

    try {
      // 1. Stripe PaymentIntentを作成 (Backend)
      // ※ ticketApi.ts ではなく直接 api.post で呼ぶ形にしています(柔軟性のため)
      const piResponse = await api.post('/create-ticket-payment-intent', {
        ticket_type_id: selectedTicket.id,
        quantity: quantity,
      });

      const { clientSecret } = piResponse.data;
      if (!clientSecret) throw new Error('決済情報の取得に失敗しました');

      // 2. Stripeシートの初期化
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU Ticket',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: user?.nickname || 'Guest',
        },
      });
      if (initError) throw new Error(initError.message);

      // 3. Stripeシートの表示 (ここでユーザーが支払う)
      const { error: presentError } = await presentPaymentSheet({});

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // キャンセルの場合は何もしない
          setIsPurchasing(false);
          return;
        }
        throw new Error(presentError.message);
      }

      // 4. 決済成功！ -> バックエンドで購入確定処理 (チケット発行)
      // StripeのIDは clientSecret の '_' より前の部分 (pi_xxxxxxxx) ですが、
      // PaymentIntentオブジェクトから取得するのが確実。
      // ここでは簡便に clientSecret から抽出、またはバックエンドが server-side で確認するため
      // IDを渡す必要があります。PaymentIntentIDは pi_xxx です。
      const paymentIntentId = clientSecret.split('_secret_')[0];

      const purchaseRes = await purchaseTicket({
        ticket_type_id: selectedTicket.id,
        quantity: quantity,
        payment_intent_id: paymentIntentId,
      });

      // 5. 完了処理
      SoundService.playSuccess();
      setModalVisible(false);

      // キャッシュ更新
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      queryClient.invalidateQueries({ queryKey: ['eventDetail'] });

      Alert.alert(
        '購入完了！',
        purchaseRes.message || 'チケットを購入しました。',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('MyPageStack', { screen: 'MyTickets' }),
          },
        ],
      );
    } catch (error: any) {
      SoundService.playError();
      const msg =
        error.response?.data?.message || error.message || '決済に失敗しました';
      Alert.alert('エラー', msg);
    } finally {
      setIsPurchasing(false);
    }
  };

  // --- 数量変更ハンドラ ---
  const incrementQuantity = () => {
    if (
      quantity < 10 &&
      selectedTicket &&
      quantity < selectedTicket.remaining
    ) {
      setQuantity(q => q + 1);
    }
  };
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  // --- 管理機能ハンドラ ---
  const handleDeleteEvent = () => {
    if (!event) return;
    Alert.alert('削除確認', '本当に削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => deleteEventMutation.mutate(event.id),
      },
    ]);
  };

  const handleDeleteTicketType = (ticketType: TicketType) => {
    Alert.alert('削除確認', '本当に削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => deleteTicketTypeMutation.mutate(ticketType.id),
      },
    ]);
  };

  if (isLoading)
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFF" />
      </SafeAreaView>
    );
  if (isError || !event)
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>エラーが発生しました</Text>
        <Button title="再試行" onPress={() => refetch()} />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching}
            onRefresh={onRefresh}
            tintColor="#FFF"
          />
        }
      >
        {/* イベント画像 */}
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.eventImage} />
        ) : (
          <View style={[styles.eventImage, styles.imagePlaceholder]} />
        )}

        <View style={styles.detailCard}>
          {isFinished && (
            <View style={styles.finishedBadge}>
              <Text style={styles.finishedText}>終了</Text>
            </View>
          )}
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.organizerName}>
            主催: {event.artist?.nickname || '不明'}
          </Text>
          <Text style={styles.value}>
            📅 {new Date(event.event_date).toLocaleString('ja-JP')}
          </Text>
          <Text style={styles.value}>📍 {event.venue}</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() =>
            navigation.navigate('ChatLobby', {
              eventId: event.id,
              eventTitle: event.title,
            })
          }
        >
          <Text style={styles.chatButtonText}>💬 チャットに参加</Text>
        </TouchableOpacity>

        {!isFinished && (
          <>
            <View style={styles.ticketHeaderContainer}>
              <Text style={styles.ticketHeader}>チケット選択</Text>
              {isAdminOrOwner && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('TicketTypeCreate', {
                      event_id: event.id,
                    })
                  }
                >
                  <Text style={styles.addButton}>＋ 追加</Text>
                </TouchableOpacity>
              )}
            </View>

            {tickets.map(item => (
              <View key={item.id} style={styles.ticketItem}>
                <View>
                  <Text style={styles.ticketName}>{item.name}</Text>
                  <Text style={styles.ticketPrice}>
                    ¥{item.price.toLocaleString()}
                  </Text>
                  <Text style={styles.ticketCapacity}>
                    残り: {item.remaining}枚
                  </Text>
                </View>
                <View>
                  {isAdminOrOwner ? (
                    <Button
                      title="削除"
                      color="#FF3B30"
                      onPress={() => handleDeleteTicketType(item)}
                    />
                  ) : (
                    <Button
                      title={item.remaining === 0 ? '完売' : '購入'}
                      disabled={item.remaining === 0}
                      onPress={() => handleOpenPurchaseModal(item)}
                    />
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {isAdminOrOwner && (
          <View style={styles.adminSection}>
            <Button
              title="イベント編集"
              onPress={() =>
                navigation.navigate('EventEdit', { eventId: event.id })
              }
              disabled={isFinished}
            />
            <View style={{ height: 10 }} />
            <Button
              title="イベント削除"
              color="#FF3B30"
              onPress={handleDeleteEvent}
            />
          </View>
        )}
      </ScrollView>

      {/* ★ 購入モーダル ★ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !isPurchasing && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>チケット購入</Text>
            {selectedTicket && (
              <>
                <Text style={styles.modalTicketName}>
                  {selectedTicket.name}
                </Text>
                <Text style={styles.modalPrice}>
                  単価: ¥{selectedTicket.price.toLocaleString()}
                </Text>

                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>枚数:</Text>
                  <TouchableOpacity
                    onPress={decrementQuantity}
                    style={styles.quantityBtn}
                  >
                    <Text style={styles.quantityBtnText}>－</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <TouchableOpacity
                    onPress={incrementQuantity}
                    style={styles.quantityBtn}
                  >
                    <Text style={styles.quantityBtnText}>＋</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>合計金額:</Text>
                  <Text style={styles.totalPrice}>
                    ¥{(selectedTicket.price * quantity).toLocaleString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.payButton, isPurchasing && styles.disabledBtn]}
                  onPress={handleProcessPayment}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.payButtonText}>支払う (Stripe)</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={isPurchasing}
                >
                  <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  eventImage: { width: '100%', height: 200, resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: '#333' },
  detailCard: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 10,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  organizerName: { color: '#AAA', marginBottom: 5 },
  value: { color: '#FFF', marginBottom: 3 },
  description: { color: '#DDD', marginTop: 15, lineHeight: 22 },
  finishedBadge: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    padding: 5,
    borderRadius: 4,
    marginBottom: 5,
  },
  finishedText: { color: '#BBB', fontSize: 12 },
  chatButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  chatButtonText: { color: '#FFF', fontWeight: 'bold' },
  ticketHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  ticketHeader: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  addButton: { color: '#0A84FF', fontSize: 16 },
  ticketItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  ticketPrice: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  ticketCapacity: { color: '#888', fontSize: 12 },
  adminSection: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#333',
    marginTop: 20,
  },
  emptyText: { color: '#FFF' },

  // モーダル用スタイル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalTicketName: { color: '#AAA', fontSize: 16, marginBottom: 5 },
  modalPrice: { color: '#FFF', fontSize: 18, marginBottom: 20 },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityLabel: { color: '#FFF', fontSize: 16, marginRight: 15 },
  quantityBtn: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnText: { color: '#FFF', fontSize: 20 },
  quantityValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderTopWidth: 1,
    borderColor: '#333',
    paddingTop: 15,
    width: '100%',
    justifyContent: 'space-between',
  },
  totalLabel: { color: '#AAA', fontSize: 16 },
  totalPrice: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold' },
  payButton: {
    backgroundColor: '#0A84FF',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  payButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { padding: 10 },
  cancelButtonText: { color: '#888' },
  disabledBtn: { opacity: 0.5 },
});

export default EventDetailScreen;
