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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { EventStackParamList } from '../navigators/EventStackNavigator';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, TicketType, fetchEventDetailData } from '../api/queries';

type EventDetailScreenRouteProp = RouteProp<EventStackParamList, 'EventDetail'>;

const EventDetailScreen = () => {
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

  // ★★★ (NEW) 過去イベント判定 ★★★
  // 現在時刻よりもイベント日時が前なら true
  const isPastEvent = event ? new Date(event.event_date) < new Date() : false;

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
    },
    onError: (error: any) => {
      Alert.alert(
        'エラー',
        error.response?.data?.message || '券種の削除に失敗しました',
      );
    },
  });

  // --- ハンドラ ---

  const handleBuyTicket = async (ticket: TicketType) => {
    setBuyingTicketId(ticket.id);
    let paymentIntentClientSecret: string | null = null;
    try {
      const response = await api.post('/create-ticket-payment-intent', {
        ticket_id: ticket.id,
        quantity: 1,
      });
      paymentIntentClientSecret = response.data.clientSecret;
      if (!paymentIntentClientSecret) {
        throw new Error('決済の準備に失敗しました');
      }
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU, Inc.',
        paymentIntentClientSecret: paymentIntentClientSecret,
      });
      if (initError) {
        throw new Error(initError.message);
      }
      const { error: presentError } = await presentPaymentSheet({});
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('決済エラー', presentError.message);
        }
        setBuyingTicketId(null);
        return;
      }
      setBuyingTicketId(null);
      Alert.alert(
        '決済完了',
        '決済が完了しました。チケットを確定しています...',
      );
      const confirmResponse = await api.post('/confirm-ticket-purchase', {
        ticket_type_id: ticket.id,
        quantity: 1,
        stripe_payment_id: paymentIntentClientSecret,
      });
      Alert.alert(
        '購入確定！',
        `「${ticket.name}」のチケット（${confirmResponse.data.tickets[0].seat_number}）を購入しました！`,
      );
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      navigation.navigate('MyPageStack', { screen: 'MyTickets' });
    } catch (error: any) {
      let message = '不明なエラーが発生しました。';
      if (error.response) {
        message = error.response.data.message || '決済に失敗しました。';
      } else if (error.message) {
        message = error.message;
      }
      Alert.alert('エラー', message);
      setBuyingTicketId(null);
    }
  };

  // ★★★ (Update) 削除時の警告メッセージを強化 ★★★
  const handleDeleteEvent = async () => {
    if (!event) return;
    Alert.alert(
      'イベントの削除',
      `「${event.title}」を本当に削除しますか？\n\n⚠️ 紐づくチャット履歴やチケット情報も全て削除されます。`,
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

  const handleAddTicketType = () => {
    if (!event) return;
    navigation.navigate('TicketTypeCreate', {
      event_id: event.id,
    });
  };

  const handleDeleteTicketType = async (ticketType: TicketType) => {
    if (buyingTicketId !== null) return;
    Alert.alert('券種の削除', `「${ticketType.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () =>
          deleteTicketTypeMutation.mutate(ticketType.id, {
            onSuccess: () => {
              Alert.alert('削除完了', `「${ticketType.name}」を削除しました。`);
            },
          }),
      },
    ]);
  };

  const handleEditEvent = () => {
    if (!event) return;
    navigation.navigate('EventEdit', { eventId: event.id });
  };

  const isOwnerOrAdmin =
    user && event && (user.id === event.artist_id || user.role === 'admin');

  const renderTicketItem = ({ item }: { item: TicketType }) => (
    <View style={styles.ticketItem}>
      <View>
        <Text style={styles.ticketName}>{item.name}</Text>
        <Text style={styles.ticketPrice}>¥{item.price.toLocaleString()}</Text>
      </View>
      <View style={styles.buttonGroup}>
        {isOwnerOrAdmin ? (
          <Button
            title="削除"
            color="#FF3B30"
            onPress={() => handleDeleteTicketType(item)}
            disabled={
              buyingTicketId !== null || deleteTicketTypeMutation.isPending
            }
          />
        ) : (
          <Button
            title={buyingTicketId === item.id ? '処理中...' : '購入する'}
            onPress={() => handleBuyTicket(item)}
            disabled={buyingTicketId !== null}
          />
        )}
      </View>
    </View>
  );

  const handleChatPress = () => {
    if (!event) return;
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
        <Text style={styles.title}>イベントの取得に失敗しました。</Text>
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
        <View style={styles.detailCard}>
          {/* ★★★ (NEW) 終了イベントの場合の表示 ★★★ */}
          {isPastEvent && (
            <View style={styles.pastEventBadge}>
              <Text style={styles.pastEventText}>
                ⚠️ このイベントは終了しました
              </Text>
            </View>
          )}

          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.venue}>{event.venue}</Text>
          <Text style={styles.date}>
            {new Date(event.event_date).toLocaleString('ja-JP')}
          </Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
          <Text style={styles.chatButtonText}>
            💬 このイベントのチャットに参加する
          </Text>
        </TouchableOpacity>

        {/* ★★★ (Update) 過去イベントならチケットエリア全体を隠す ★★★ */}
        {!isPastEvent && (
          <>
            <View style={styles.ticketHeaderContainer}>
              <Text style={styles.ticketHeader}>チケットを選択</Text>
              {/* アーティスト/管理者のみ「券種を追加」を表示 */}
              {isOwnerOrAdmin && (
                <TouchableOpacity onPress={handleAddTicketType}>
                  <Text style={styles.addButton}>＋ 券種を追加</Text>
                </TouchableOpacity>
              )}
            </View>

            {tickets.length === 0 ? (
              <Text style={styles.emptyText}>
                このイベントにはまだ券種が登録されていません。
              </Text>
            ) : (
              <FlatList
                data={tickets}
                renderItem={renderTicketItem}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            )}
          </>
        )}

        {isOwnerOrAdmin && (
          <View style={styles.adminButtonContainer}>
            {/* ★★★ (Update) 過去イベントなら編集ボタンを隠す ★★★ */}
            {!isPastEvent && (
              <Button
                title="イベントを編集する"
                onPress={handleEditEvent}
                color="#0A84FF"
                disabled={deleteEventMutation.isPending}
              />
            )}

            <View style={{ marginTop: 10 }}>
              <Button
                title="イベントを削除する"
                onPress={handleDeleteEvent}
                color="#FF3B30"
                disabled={deleteEventMutation.isPending}
              />
            </View>
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
  },
  detailCard: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    margin: 15,
    borderRadius: 8,
  },
  // ★★★ (NEW) 終了バッジのスタイル ★★★
  pastEventBadge: {
    backgroundColor: '#333333',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  pastEventText: {
    color: '#FFD700', // ゴールドっぽい黄色で注意喚起
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  venue: { fontSize: 18, color: '#BBBBBB', marginBottom: 5 },
  date: { fontSize: 16, color: '#888888', marginBottom: 15 },
  description: { fontSize: 16, color: '#FFFFFF', lineHeight: 24 },

  ticketHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  ticketHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
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
  ticketPrice: { fontSize: 16, color: '#4CAF50', marginTop: 5 },
  buttonGroup: { flexDirection: 'row' },
  emptyText: {
    color: '#888888',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 15,
  },
  adminButtonContainer: {
    margin: 15,
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 20,
    backgroundColor: '#1C1C1E',
    padding: 15,
    borderRadius: 8,
  },
  chatButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EventDetailScreen;
