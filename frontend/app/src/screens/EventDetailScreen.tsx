import React, { useState, useCallback } from 'react'; // 1. ★ useCallback は不要に
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
  RefreshControl, // 2. ★ RefreshControl をインポート
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'; // 3. ★ useFocusEffect は不要に
import { useStripe } from '@stripe/stripe-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { EventStackParamList } from '../navigators/EventStackNavigator';
import api from '../services/api'; // (mutation でまだ使う)
import { useAuth } from '../context/AuthContext';

// 4. ★ React Query と新しい型/関数をインポート
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Event, // (api/queries.ts から)
  TicketType, // (api/queries.ts から)
  fetchEventDetailData, // (api/queries.ts から)
} from '../api/queries'; // 5. ★ 型定義は削除

// route.params の型
type EventDetailScreenRouteProp = RouteProp<EventStackParamList, 'EventDetail'>;

const EventDetailScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation<any>();
  const route = useRoute<EventDetailScreenRouteProp>();
  const eventId = route.params?.eventId;

  const { user } = useAuth();
  const queryClient = useQueryClient(); // 6. ★ QueryClient を取得

  // 7. ★ (ローディング中も eventId は必要なので、外に出す)
  const [buyingTicketId, setBuyingTicketId] = useState<number | null>(null);

  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // 9. ★★★ (NEW) useQuery フック ★★★
  const {
    data, // 👈 { event, tickets } が入る
    isLoading, // 👈 最初のローディング
    isRefetching, // 👈 スワイプ更新中のローディング
    refetch,
    isError,
  } = useQuery({
    // 10. ★ キャッシュキー (['eventDetail', 1] のように eventId と紐づける)
    queryKey: ['eventDetail', eventId],

    // 11. ★ queries.ts の "Promise.all" 関数を呼び出す
    queryFn: () => fetchEventDetailData(eventId!), // 13. ★ eventId! (nullでないことを保証)

    // 12. ★ eventId が undefined の場合はクエリを実行しない
    enabled: !!eventId,
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true); // 👈 クルクル開始
    try {
      await refetch(); // 👈 useQuery の refetch を実行
    } catch (error) {
      // (エラーは useQuery の isError が検知)
    }
    setIsManualRefetching(false); // 👈 クルクル停止
  }, [refetch]);

  // 14. ★ data から event と tickets を取り出す
  const event: Event | undefined = data?.event;
  const tickets: TicketType[] = data?.tickets || [];

  // 15. ★★★ (NEW) イベント削除の useMutation ★★★
  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => {
      // 削除成功時、イベント一覧 (['events']) のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['events'] });
      Alert.alert('削除完了', `「${event?.title}」を削除しました。`);
      navigation.goBack(); // 16. ★ 一覧画面に戻る
    },
    onError: (error: any) => {
      Alert.alert(
        'エラー',
        error.response?.data?.message || 'イベントの削除に失敗しました',
      );
    },
  });

  // 17. ★★★ (NEW) 券種削除の useMutation ★★★
  const deleteTicketTypeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/ticket-types/${id}`),
    onSuccess: () => {
      // ★ 成功したらキャッシュを無効化する "だけ" にする
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

  // ★ チケット購入処理 (変更なし)
  const handleBuyTicket = async (ticket: TicketType) => {
    // ... (元のコードと全く同じ) ...
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
      // (オプション) マイチケットのキャッシュも無効化
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

  // 19. ★ イベント削除ハンドラ (mutation を呼ぶだけ)
  const handleDeleteEvent = async () => {
    if (!event) return;
    Alert.alert('イベントの削除', `「${event.title}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => deleteEventMutation.mutate(event.id), // 👈
      },
    ]);
  };

  // ★ 「券種を追加」ボタンの処理 (変更なし)
  const handleAddTicketType = () => {
    if (!event) return;
    navigation.navigate('TicketTypeCreate', {
      event_id: event.id,
    });
  };

  // 20. ★ 券種削除ハンドラ (mutation を呼ぶだけ)
  const handleDeleteTicketType = async (ticketType: TicketType) => {
    if (buyingTicketId !== null) return;
    Alert.alert('券種の削除', `「${ticketType.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () =>
          deleteTicketTypeMutation.mutate(ticketType.id, {
            // ★ (NEW) 'onSuccess' をここで定義する
            onSuccess: () => {
              // (ここで invalidateQueries を呼んでも良いが、Aで呼んでいるので不要)
              // ★ 'ticketType' がスコープ内にあるので、ここでアラートを出す
              Alert.alert('削除完了', `「${ticketType.name}」を削除しました。`);
            },
          }),
      },
    ]);
  };

  // ★ イベント編集ボタン (変更なし)
  const handleEditEvent = () => {
    if (!event) return;
    navigation.navigate('EventEdit', { eventId: event.id });
  };

  const isOwnerOrAdmin =
    user && event && (user.id === event.artist_id || user.role === 'admin');

  // リストの各アイテム
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
              buyingTicketId !== null || deleteTicketTypeMutation.isPending // 21. ★ 削除中も無効化
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

  // 22. ★ ローディング/エラー表示 (isLoading, isError, !data を使用)
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

  // 23. ★ メインのJSX
  return (
    <SafeAreaView style={styles.container}>
      {/* 24. ★ ScrollView に RefreshControl を追加 */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching} // 👈 'isManualRefetching' を渡す
            onRefresh={onRefresh} // 👈 'onRefresh' (自作した関数) を渡す
            tintColor="#FFFFFF"
          />
        }
      >
        <View style={styles.detailCard}>
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

        <View style={styles.ticketHeaderContainer}>
          <Text style={styles.ticketHeader}>チケットを選択</Text>
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

        {isOwnerOrAdmin && (
          <View style={styles.adminButtonContainer}>
            <Button
              title="イベントを編集する"
              onPress={handleEditEvent}
              color="#0A84FF"
              disabled={deleteEventMutation.isPending} // 25. ★ 削除中も無効化
            />
            <View style={{ marginTop: 10 }}>
              <Button
                title="イベントを削除する"
                onPress={handleDeleteEvent}
                color="#FF3B30"
                disabled={deleteEventMutation.isPending} // 25. ★ 削除中も無効化
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// スタイル (変更なし ... 1点だけ 'center' を追加)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  // 26. ★ (NEW) 中央配置用のスタイル
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
