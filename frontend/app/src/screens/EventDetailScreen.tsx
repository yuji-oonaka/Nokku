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
  RouteProp,
} from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { EventStackParamList } from '../navigators/EventStackNavigator';
import api from '../services/api';

// 1. ★ useAuth をインポート
import { useAuth } from '../context/AuthContext';

// 型定義 (Event)
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  artist_id: number; // artist_id は必須
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

// 2. ★ ユーザー情報の型 (User) は AuthContext から来るので削除

// route.params の型
type EventDetailScreenRouteProp = RouteProp<EventStackParamList, 'EventDetail'>;


const EventDetailScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation<any>();
  const route = useRoute<EventDetailScreenRouteProp>();
  const eventId = route.params?.eventId;

  // 3. ★ useAuth フックからグローバルな user 情報を取得
  const { user } = useAuth(); // AuthContext が /profile を管理

  // 4. ★ useState(user) を削除
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);

  // この画面専用のローディング（イベント・券種取得）は必要
  const [loading, setLoading] = useState(true);
  const [buyingTicketId, setBuyingTicketId] = useState<number | null>(null);

  // データをすべて取得する関数 (リファクタリング)
  const fetchData = useCallback(async () => {
    // 5. ★ eventId のチェック (念のため)
    if (!eventId) {
      Alert.alert('エラー', 'イベントIDが指定されていません。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 6. ★ Promise.all から /profile の呼び出しを削除
      const [eventResponse, ticketsResponse] = await Promise.all([
        api.get(`/events/${eventId}`), // イベント詳細 (show API)
        api.get(`/events/${eventId}/ticket-types`), // 券種一覧
        // api.get('/profile'), // ← 削除 (AuthContext が担当)
      ]);

      setEvent(eventResponse.data);
      setTickets(ticketsResponse.data);
      // setUser(userResponse.data); // ← 削除
    } catch (error: any) {
      console.error('データ取得エラー:', error);
      Alert.alert('エラー', 'データの取得に失敗しました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [eventId, navigation]); // 7. ★ 依存配列から user を削除

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // ★ チケット購入処理 (変更なし)
  const handleBuyTicket = async (ticket: TicketType) => {
    // ... (中身は変更なし) ...
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
      const { error: presentError } = await presentPaymentSheet({
      });
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

  // ★ イベント削除処理 (変更なし)
  const handleDeleteEvent = async () => {
    // ... (中身は変更なし) ...
    if (!event) return;
    Alert.alert('イベントの削除', `「${event.title}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
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

  // ★ 「券種を追加」ボタンの処理 (変更なし)
  const handleAddTicketType = () => {
    if (!event) return;
    navigation.navigate('TicketTypeCreate', {
      event_id: event.id,
    });
  };

  // ★ 券種削除処理 (変更なし)
  const handleDeleteTicketType = async (ticketType: TicketType) => {
    // ... (中身は変更なし) ...
    if (buyingTicketId !== null) return;
    Alert.alert('券種の削除', `「${ticketType.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/ticket-types/${ticketType.id}`);
            Alert.alert('削除完了', `「${ticketType.name}」を削除しました。`);
            fetchData(); // リストを即時更新
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

  // ★ イベント編集ボタン (変更なし)
  const handleEditEvent = () => {
    if (!event) return;
    navigation.navigate('EventEdit', { eventId: event.id });
  };

  // 8. ★ isOwnerOrAdmin 判定は変更なし (useAuth の 'user' を自動で参照)
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
        {/* 9. ★ isOwnerOrAdmin (グローバルな user を参照) */}
        {isOwnerOrAdmin ? (
          // 【管理者/アーティスト用】
          <Button
            title="削除"
            color="#FF3B30"
            onPress={() => handleDeleteTicketType(item)}
            disabled={buyingTicketId !== null}
          />
        ) : (
          // 【一般ユーザー用】
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
    if (!event) return; // event が null でないことを確認 (event は fetch で取得済み)

    // eventId と eventTitle の両方を渡す
    navigation.navigate('ChatLobby', {
      eventId: event.id,
      eventTitle: event.title,
    });
  };

  // 11. ★ 早期リターン (ローディングまたはイベントデータなし)
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

  // 12. ★ メインのJSX (変更なし)
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

        <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
          <Text style={styles.chatButtonText}>
            💬 このイベントのチャットに参加する
          </Text>
        </TouchableOpacity>

        <View style={styles.ticketHeaderContainer}>
          <Text style={styles.ticketHeader}>チケットを選択</Text>
          {/* 13. ★ isOwnerOrAdmin (グローバルな user を参照) */}
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

        {/* 14. ★ isOwnerOrAdmin (グローバルな user を参照) */}
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

// ... (Styles は変更なし) ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
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
    backgroundColor: '#0A84FF', // 目立つ青色
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
