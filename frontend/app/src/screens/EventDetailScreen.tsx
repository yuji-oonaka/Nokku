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
  useFocusEffect, // 👈 1. useFocusEffect をインポート
} from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { EventStackParamList } from '../navigators/EventStackNavigator';

const API_URL = 'http://10.0.2.2';

// 型定義 (Event)
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
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

interface Props {
  authToken: string;
}

// ナビゲーションの型
type EventDetailNavigationProp = StackNavigationProp<
  EventStackParamList,
  'EventDetail'
>;

const EventDetailScreen: React.FC<Props> = ({ authToken }) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation<EventDetailNavigationProp>();
  const route = useRoute();

  const { event } = route.params as { event: Event };

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingTicketId, setBuyingTicketId] = useState<number | null>(null);

  // ↓↓↓ 2. fetchTicketTypes関数を useCallback で「外」に定義 ↓↓↓
  const fetchTicketTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/events/${event.id}/ticket-types`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error('チケット情報の取得に失敗しました');
      }
      const data = (await response.json()) as TicketType[];
      setTickets(data);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    } finally {
      setLoading(false);
    }
  }, [event.id, authToken]);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        await fetchTicketTypes(); // ← awaitできる
      };
      fetchData(); // ← 非同期関数を呼び出す
    }, [fetchTicketTypes]),
  );

  // ★ チケット購入処理 (変更なし)
  const handleBuyTicket = async (ticket: TicketType) => {
    setBuyingTicketId(ticket.id);
    let paymentIntentClientSecret: string | null = null;
    try {
      // 1. 決済IDリクエスト
      const response = await fetch(
        `${API_URL}/api/create-ticket-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            ticket_id: ticket.id,
            quantity: 1,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '決済の準備に失敗しました');
      }
      paymentIntentClientSecret = data.clientSecret;

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

      // 4. 決済成功 → 購入確定API呼び出し
      setBuyingTicketId(null);
      Alert.alert(
        '決済完了',
        '決済が完了しました。チケットを確定しています...',
      );
      const confirmResponse = await fetch(
        `${API_URL}/api/confirm-ticket-purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            ticket_type_id: ticket.id,
            quantity: 1,
            stripe_payment_id: paymentIntentClientSecret,
          }),
        },
      );
      const confirmData = await confirmResponse.json();
      if (!confirmResponse.ok) {
        throw new Error(
          confirmData.message || 'チケットの確定に失敗しました。',
        );
      }
      Alert.alert(
        '購入確定！',
        `「${ticket.name}」のチケット（${confirmData.tickets[0].seat_number}）を購入しました！`,
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('エラー', error.message);
      setBuyingTicketId(null);
    }
  };

  // 👈 イベント削除処理 (変更なし)
  const handleDeleteEvent = async () => {
    Alert.alert(
      'イベントの削除',
      `「${event.title}」を本当に削除しますか？\n（関連する券種や購入済みチケットもすべて削除されます）`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_URL}/api/events/${event.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                  },
                },
              );
              if (!response.ok) {
                if (response.status === 403) {
                  throw new Error('このイベントを削除する権限がありません');
                }
                throw new Error('イベントの削除に失敗しました');
              }
              Alert.alert('削除完了', `「${event.title}」を削除しました。`);
              navigation.navigate('EventList');
            } catch (error: any) {
              Alert.alert('エラー', error.message);
            }
          },
        },
      ],
    );
  };

  // 👈 「券種を追加」ボタンの処理 (変更なし)
  const handleAddTicketType = () => {
    navigation.navigate('TicketTypeCreate', {
      event_id: event.id,
    });
  };

  // 👈 券種（S席など）を削除する処理
  const handleDeleteTicketType = async (ticketType: TicketType) => {
    if (buyingTicketId !== null) return;
    Alert.alert(
      '券種の削除',
      `「${ticketType.name}」を本当に削除しますか？\n（この券種の購入済みチケットもすべて削除されます）`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_URL}/api/ticket-types/${ticketType.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                  },
                },
              );
              if (!response.ok) {
                if (response.status === 403) {
                  throw new Error('この券種を削除する権限がありません');
                }
                throw new Error('券種の削除に失敗しました');
              }
              Alert.alert('削除完了', `「${ticketType.name}」を削除しました。`);
              // ★ リストを即時更新 ( 'fetchTicketTypes' がスコープ内にあるため呼び出せる)
              fetchTicketTypes();
            } catch (error: any) {
              Alert.alert('エラー', error.message);
            }
          },
        },
      ],
    );
  };

  // リストの各アイテム (変更なし)
  const renderTicketItem = ({ item }: { item: TicketType }) => (
    <View style={styles.ticketItem}>
      <View>
        <Text style={styles.ticketName}>{item.name}</Text>
        <Text style={styles.ticketPrice}>¥{item.price.toLocaleString()}</Text>
      </View>
      <View style={styles.buttonGroup}>
        <Button
          title="削除"
          color="#FF3B30"
          onPress={() => handleDeleteTicketType(item)}
          disabled={buyingTicketId !== null}
        />
        <View style={{ width: 10 }} />
        <Button
          title={buyingTicketId === item.id ? '処理中...' : '購入する'}
          onPress={() => handleBuyTicket(item)}
          disabled={buyingTicketId !== null}
        />
      </View>
    </View>
  );

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
          <TouchableOpacity onPress={handleAddTicketType}>
            <Text style={styles.addButton}>＋ 券種を追加</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : tickets.length === 0 ? (
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
        <View style={styles.deleteButtonContainer}>
          <Button
            title="このイベントを削除"
            color="#FF3B30"
            onPress={handleDeleteEvent}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイルシート (変更なし) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  detailCard: {
    backgroundColor: '#222',
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
    backgroundColor: '#222',
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 15,
  },
  deleteButtonContainer: {
    margin: 15,
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#555',
    paddingTop: 20,
  },
});

export default EventDetailScreen;
