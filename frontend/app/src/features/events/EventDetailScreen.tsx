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

  const handleBuyTicket = async (ticket: TicketType) => {
    setBuyingTicketId(ticket.id);
    SoundService.triggerHaptic('impactMedium');

    try {
      const response = await api.post('/create-ticket-payment-intent', {
        ticket_id: ticket.id,
        quantity: 1,
      });
      const { clientSecret } = response.data;
      if (!clientSecret) throw new Error('決済の準備に失敗しました');

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU, Inc.',
        paymentIntentClientSecret: clientSecret,
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet({});
      if (presentError) {
        if (presentError.code !== 'Canceled')
          Alert.alert('決済エラー', presentError.message);
        setBuyingTicketId(null);
        return;
      }

      await api.post('/confirm-ticket-purchase', {
        ticket_type_id: ticket.id,
        quantity: 1,
        stripe_payment_id: clientSecret,
      });

      SoundService.playSuccess();
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      setBuyingTicketId(null);

      Alert.alert(
        '購入確定！',
        `「${ticket.name}」のチケットを購入しました！`,
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
      const message =
        error.response?.data?.message ||
        error.message ||
        '決済に失敗しました。';
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
            navigation.navigate('ChatLobby', {
              eventId: event.id,
              eventTitle: event.title,
            });
          }}
        >
          <Text style={styles.chatButtonText}>
            💬 このイベントのチャットに参加する
          </Text>
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
              onBuy={handleBuyTicket}
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
});

export default EventDetailScreen;
