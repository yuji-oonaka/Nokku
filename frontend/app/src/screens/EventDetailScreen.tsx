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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { EventStackParamList } from '../navigators/EventStackNavigator';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SoundService from '../services/SoundService';
import { Event, TicketType, fetchEventDetailData } from '../api/queries';

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

  // 過去イベント判定
  const eventDate = new Date(event?.event_date || 0);
  const now = new Date();
  const isFinished = now.getTime() > eventDate.getTime();

  const isAdminOrOwner =
    user && event && (user.id === event.artist_id || user.role === 'admin');

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

    let paymentIntentClientSecret: string | null = null;
    try {
      const response = await api.post('/create-ticket-payment-intent', {
        ticket_id: ticket.id,
        quantity: 1,
      });
      paymentIntentClientSecret = response.data.clientSecret;
      if (!paymentIntentClientSecret)
        throw new Error('決済の準備に失敗しました');

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU, Inc.',
        paymentIntentClientSecret: paymentIntentClientSecret,
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet({});
      if (presentError) {
        if (presentError.code !== 'Canceled')
          Alert.alert('決済エラー', presentError.message);
        setBuyingTicketId(null);
        return;
      }

      setBuyingTicketId(null);

      const confirmResponse = await api.post('/confirm-ticket-purchase', {
        ticket_type_id: ticket.id,
        quantity: 1,
        stripe_payment_id: paymentIntentClientSecret,
      });

      SoundService.playSuccess();
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });

      Alert.alert(
        '購入確定！',
        `「${ticket.name}」のチケットを購入しました！\nマイページから確認できます。`,
        [
          {
            text: 'OK',
            onPress: () => {
              // ★ シンプルな遷移に変更
              navigation.navigate('MyPageStack', {
                screen: 'MyTickets',
              });
            },
          },
        ],
      );
    } catch (error: any) {
      SoundService.playError();
      let message = '不明なエラーが発生しました。';
      if (error.response)
        message = error.response.data.message || '決済に失敗しました。';
      else if (error.message) message = error.message;

      Alert.alert('エラー', message);
      setBuyingTicketId(null);
    }
  };

  const handleDeleteEvent = () => {
    if (!event) return;
    Alert.alert(
      'イベント削除',
      '本当にこのイベントを削除しますか？\n※関連するチケット情報やチャット履歴もすべて削除されます。',
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

  const handleEditEvent = () => {
    if (!event) return;
    navigation.navigate('EventEdit', { eventId: event.id });
  };

  const handleAddTicketType = () => {
    if (!event) return;
    navigation.navigate('TicketTypeCreate', { event_id: event.id });
  };

  const handleChatPress = () => {
    if (!event) return;
    SoundService.triggerHaptic('impactLight');
    navigation.navigate('ChatLobby', {
      eventId: event.id,
      eventTitle: event.title,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (isError || !data || !event) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>イベントの取得に失敗しました。</Text>
        <Button title="再試行" onPress={() => refetch()} color="#0A84FF" />
      </SafeAreaView>
    );
  }

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
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.eventImage} />
        ) : (
          <View style={[styles.eventImage, styles.imagePlaceholder]} />
        )}

        <View style={styles.detailCard}>
          {isFinished && (
            <View style={styles.finishedBadge}>
              <Text style={styles.finishedText}>
                このイベントは終了しました
              </Text>
            </View>
          )}

          <Text style={styles.title}>{event.title}</Text>

          {event.artist && (
            <View style={styles.organizerRow}>
              {event.artist.image_url ? (
                <Image
                  source={{ uri: event.artist.image_url }}
                  style={styles.organizerAvatar}
                />
              ) : (
                <View
                  style={[styles.organizerAvatar, styles.avatarPlaceholder]}
                />
              )}
              <Text style={styles.organizerName}>
                主催: {event.artist.nickname}
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.label}>📅 日時:</Text>
            <Text style={styles.value}>
              {new Date(event.event_date).toLocaleString('ja-JP')}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.label}>📍 会場:</Text>
            <Text style={styles.value}>{event.venue}</Text>
          </View>

          <Text style={styles.description}>{event.description}</Text>
        </View>

        <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
          <Text style={styles.chatButtonText}>
            💬 このイベントのチャットに参加する
          </Text>
        </TouchableOpacity>

        {!isFinished && (
          <>
            <View style={styles.ticketHeaderContainer}>
              <Text style={styles.ticketHeader}>チケットを選択</Text>
              {isAdminOrOwner && (
                <TouchableOpacity onPress={handleAddTicketType}>
                  <Text style={styles.addButton}>＋ 券種を追加</Text>
                </TouchableOpacity>
              )}
            </View>

            {tickets.length === 0 ? (
              <Text style={styles.emptyText}>
                まだチケットが登録されていません。
              </Text>
            ) : (
              <FlatList
                data={tickets}
                renderItem={({ item }) => (
                  <View style={styles.ticketItem}>
                    <View>
                      <Text style={styles.ticketName}>{item.name}</Text>
                      <Text style={styles.ticketPrice}>
                        ¥{item.price.toLocaleString()}
                      </Text>
                      <Text style={styles.ticketCapacity}>
                        残り: {item.capacity}枚
                        {item.seating_type === 'random'
                          ? ' (自動座席指定)'
                          : ' (自由席)'}
                      </Text>
                    </View>
                    <View style={styles.buttonGroup}>
                      {isAdminOrOwner ? (
                        <Button
                          title="削除"
                          color="#FF3B30"
                          onPress={() => handleDeleteTicketType(item)}
                          disabled={deleteTicketTypeMutation.isPending}
                        />
                      ) : (
                        <Button
                          title={
                            buyingTicketId === item.id
                              ? '処理中...'
                              : '購入する'
                          }
                          onPress={() => handleBuyTicket(item)}
                          disabled={buyingTicketId !== null}
                        />
                      )}
                    </View>
                  </View>
                )}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </>
        )}

        {isAdminOrOwner && (
          <View style={styles.adminSection}>
            <Text style={styles.adminTitle}>管理者メニュー</Text>
            <View style={styles.adminButtons}>
              <TouchableOpacity
                style={[
                  styles.adminBtn,
                  styles.editBtn,
                  isFinished && styles.disabledBtn,
                ]}
                onPress={handleEditEvent}
                disabled={isFinished}
              >
                <Text style={styles.adminBtnText}>
                  {isFinished ? '編集不可' : 'イベント編集'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.adminBtn, styles.deleteBtn]}
                onPress={handleDeleteEvent}
              >
                <Text style={styles.adminBtnText}>削除</Text>
              </TouchableOpacity>
            </View>
            {isFinished && (
              <Text style={styles.adminNote}>
                ※終了したイベントは編集できません。
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  eventImage: { width: '100%', height: 220, resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: 220, backgroundColor: '#333' },

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
  organizerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  avatarPlaceholder: { backgroundColor: '#555' },
  organizerName: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  metaRow: { flexDirection: 'row', marginBottom: 5 },
  label: { color: '#AAA', fontSize: 14, width: 60 },
  value: { color: '#FFF', fontSize: 14, flex: 1 },

  description: {
    fontSize: 15,
    color: '#DDD',
    marginTop: 15,
    lineHeight: 24,
  },

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
  ticketItem: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  ticketPrice: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 5,
    fontWeight: 'bold',
  },
  ticketCapacity: { fontSize: 12, color: '#888', marginTop: 2 },
  buttonGroup: { flexDirection: 'row' },

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

  adminSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingBottom: 50,
  },
  adminTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  adminButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  adminBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  editBtn: { backgroundColor: '#0A84FF' },
  deleteBtn: { backgroundColor: '#FF3B30' },
  disabledBtn: { backgroundColor: '#555' },
  adminBtnText: { color: '#FFF', fontWeight: 'bold' },
  adminNote: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
});

export default EventDetailScreen;
