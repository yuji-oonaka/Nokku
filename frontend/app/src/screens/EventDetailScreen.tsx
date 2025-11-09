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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  RouteProp, // 1. RouteProp をインポート
} from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
// 2. EventStackParamList のパスは、ご自身の環境に合わせてください
import { EventStackParamList } from '../navigation/EventStackNavigator';
import api from '../services/api'; // 3. ★ api.ts をインポート

// 型定義 (Event)
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  // ★ artist_id を追加 (編集ボタンの表示制御用)
  artist_id: number;
}

// 型定義 (TicketType)
interface TicketType {
  id: number;
  event_id: number;
  name: string;
  price: number;
  capacity: number;
  seating_type: 'random' | 'free';
}

// 4. ★ ユーザー情報の型 (簡易版)
interface User {
  id: number;
  role: 'user' | 'artist' | 'admin';
}

// 5. ★ route.params の型を正しく定義
type EventDetailScreenRouteProp = RouteProp<EventStackParamList, 'EventDetail'>;

// ナビゲーションの型
type EventDetailNavigationProp = StackNavigationProp<
  EventStackParamList,
  'EventDetail'
>;

// 6. ★ Props を削除 (authToken は不要)
const EventDetailScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation<EventDetailNavigationProp>();
  const route = useRoute<EventDetailScreenRouteProp>();

  // 7. ★ eventId を route.params から取得
  const { eventId } = route.params;

  // 8. ★ event と user の state を追加
  const [event, setEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<User | null>(null); // ログインユーザー情報
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingTicketId, setBuyingTicketId] = useState<number | null>(null);

  // 9. ★ データをすべて取得する関数 (リファクタリング)
  const fetchData = useCallback(async () => {
    // 1. ★ eventId のチェックを setLoading(true) より先に行う
    if (!eventId) {
      Alert.alert('エラー', 'イベントIDが指定されていません。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setLoading(false); // ★ eventId が無くてもローディングを解除
      return;
    }

    // 2. ★ setLoading(true) を try の「外」に移動
    setLoading(true);
    try {
      const [eventResponse, ticketsResponse, userResponse] = await Promise.all([
        api.get(`/events/${eventId}`), // イベント詳細
        api.get(`/events/${eventId}/ticket-types`), // 券種一覧
        api.get('/profile'), // ログインユーザー情報
      ]);

      setEvent(eventResponse.data);
      setTickets(ticketsResponse.data);
      setUser(userResponse.data);
    } catch (error: any) {
      console.error('データ取得エラー:', error);
      Alert.alert('エラー', 'データの取得に失敗しました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      // ★ catch に入った場合でも、finally で setLoading(false) が呼ばれる
    } finally {
      setLoading(false);
    }
  }, [eventId, navigation]);

  // 11. ★ useFocusEffect で fetchData を呼ぶ
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // ★ チケット購入処理 (リファクタリング)
  const handleBuyTicket = async (ticket: TicketType) => {
    setBuyingTicketId(ticket.id);
    let paymentIntentClientSecret: string | null = null;
    try {
      // 1. 決済IDリクエスト (api.post)
      const response = await api.post('/create-ticket-payment-intent', {
        ticket_id: ticket.id,
        quantity: 1,
      });

      paymentIntentClientSecret = response.data.clientSecret;
      if (!paymentIntentClientSecret) {
        throw new Error('決済の準備に失敗しました');
      }

      // 2. Stripe初期化
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU, Inc.',
        paymentIntentClientSecret: paymentIntentClientSecret,
        merchantLocale: 'ja-JP',
      });
      if (initError) {
        throw new Error(initError.message);
      }

      // 3. 決済シート表示
      const { error: presentError } = await presentPaymentSheet({
        locale: 'ja',
      });
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('決済エラー', presentError.message);
        }
        setBuyingTicketId(null);
        return;
      }

      // 4. 決済成功 → 購入確定API呼び出し (api.post)
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
      // マイチケット画面に遷移する方が親切かも？
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

  // ★ イベント削除処理 (リファクタリング)
  const handleDeleteEvent = async () => {
    if (!event) return;
    Alert.alert('イベントの削除', `「${event.title}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            // 12. ★ api.delete を使用
            await api.delete(`/events/${event.id}`);
            Alert.alert('削除完了', `「${event.title}」を削除しました。`);
            navigation.navigate('EventList'); // EventList に戻る
          } catch (error: any) {
            Alert.alert(
              'エラー',
              error.response?.data?.message || 'イベントの削除に失敗しました',
            );
          }
        },
      },
    ]);
  };

  // ★ 「券種を追加」ボタンの処理 (リファクタリング)
  const handleAddTicketType = () => {
    if (!event) return;
    navigation.navigate('TicketTypeCreate', {
      event_id: event.id,
    });
  };

  // ★ 券種削除処理 (リファクタリング)
  const handleDeleteTicketType = async (ticketType: TicketType) => {
    if (buyingTicketId !== null) return;
    Alert.alert('券種の削除', `「${ticketType.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            // 13. ★ api.delete を使用
            await api.delete(`/ticket-types/${ticketType.id}`);
            Alert.alert('削除完了', `「${ticketType.name}」を削除しました。`);
            // ★ リストを即時更新 (fetchData を呼び出す)
            fetchData();
          } catch (error: any) {
            Alert.alert(
              'エラー',
              error.response?.data?.message || '券種の削除に失敗しました',
            );
          }
        },
      },
    ]);
  };

  // 14. ★★★ イベント編集ボタン（今回のタスク） ★★★
  const handleEditEvent = () => {
    if (!event) return;
    navigation.navigate('EventEdit', { eventId: event.id });
  };

  // 15. ★ アーティスト/管理者かどうかの判定
  const isOwnerOrAdmin =
    user && event && (user.id === event.artist_id || user.role === 'admin');

  // リストの各アイテム (変更なし)
  const renderTicketItem = ({ item }: { item: TicketType }) => (
    <View style={styles.ticketItem}>
      <View>
        <Text style={styles.ticketName}>{item.name}</Text>
        <Text style={styles.ticketPrice}>¥{item.price.toLocaleString()}</Text>
      </View>
      <View style={styles.buttonGroup}>
        {/* 16. ★ 権限がある場合のみ削除ボタンを表示 */}
        {isOwnerOrAdmin && (
          <Button
            title="削除"
            color="#FF3B30"
            onPress={() => handleDeleteTicketType(item)}
            disabled={buyingTicketId !== null}
          />
        )}
        <View style={{ width: 10 }} />
        <Button
          title={buyingTicketId === item.id ? '処理中...' : '購入する'}
          onPress={() => handleBuyTicket(item)}
          disabled={buyingTicketId !== null}
        />
      </View>
    </View>
  );

  // 17. ★ 早期リターン (ローディングまたはイベントデータなし)
  if (loading || !event) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  // 18. ★ メインのJSX (リファクタリング)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.detailCard}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.venue}>{event.venue}</Text>
          <Text style={styles.date}>
            {new Date(event.event_date).toLocaleString('ja-JP')}
          </Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.ticketHeaderContainer}>
          <Text style={styles.ticketHeader}>チケットを選択</Text>
          {/* 19. ★ 権限がある場合のみ「券種を追加」を表示 */}
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

        {/* 20. ★ 管理者用ボタンコンテナ (編集と削除) */}
        {isOwnerOrAdmin && (
          <View style={styles.adminButtonContainer}>
            <Button
              title="イベントを編集する"
              onPress={handleEditEvent} // 編集ボタン
              color="#0A84FF" // 青
            />
            <View style={{ marginTop: 10 }}>
              <Button
                title="イベントを削除する"
                onPress={handleDeleteEvent} // 削除ボタン
                color="#FF3B30" // 赤
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイルシート (adminButtonContainer を追加) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' }, // 背景を黒に変更
  detailCard: {
    backgroundColor: '#1C1C1E', // ダークモード
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
    backgroundColor: '#1C1C1E', // ダークモード
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
    color: '#888888', // 少し暗く
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 15,
  },
  // 21. ★ 新しい管理者ボタンコンテナのスタイル
  adminButtonContainer: {
    margin: 15,
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#333', // 区切り線
    paddingTop: 20,
    backgroundColor: '#1C1C1E',
    padding: 15,
    borderRadius: 8,
  },
});

export default EventDetailScreen;
