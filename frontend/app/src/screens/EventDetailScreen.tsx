import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  Button,
  ScrollView, // ScrollViewのインポート
} from 'react-native';
import {
  useRoute,
  useNavigation,
  useFocusEffect, // useFocusEffectのインポート
} from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';

const API_URL = 'http://10.0.2.2';

// 型定義 (priceの無いクリーンなEvent)
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
}

// DBのticket_typesテーブルに合わせた型
interface TicketType {
  id: number;
  event_id: number;
  name: string; // S席, A席
  price: number;
  capacity: number;
  seating_type: 'random' | 'free';
}

interface Props {
  authToken: string;
}

const EventDetailScreen: React.FC<Props> = ({ authToken }) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation();
  const route = useRoute();

  // 前の画面(EventList)から渡された event オブジェクトを取得
  const { event } = route.params as { event: Event };

  const [tickets, setTickets] = useState<TicketType[]>([]); // 本物のチケット一覧
  const [loading, setLoading] = useState(true); // チケット取得中のローディング
  const [buyingTicketId, setBuyingTicketId] = useState<number | null>(null); // 購入処理中のチケットID

  // 画面にフォーカスが当たるたびに、本物のチケット情報をDBから取得
  useFocusEffect(
    useCallback(() => {
      const fetchTicketTypes = async () => {
        try {
          setLoading(true);
          // バックエンドにこのイベントの券種一覧をリクエスト
          const response = await fetch(
            `${API_URL}/api/events/${event.id}/ticket-types`, // 新しいAPIエンドポイント
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
          setTickets(data); // 取得した本物のチケットを State に保存
        } catch (error: any) {
          Alert.alert('エラー', error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchTicketTypes();
    }, [event.id, authToken]),
  );

  // ★ チケット購入ボタンが押された時の処理
  const handleBuyTicket = async (ticket: TicketType) => {
    setBuyingTicketId(ticket.id);
    let paymentIntentClientSecret: string | null = null; // 👈 1. clientSecretを保持する変数を追加

    try {
      // 1. バックエンドにチケット決済IDをリクエスト
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

      // 2. clientSecret を変数に保存
      paymentIntentClientSecret = data.clientSecret;

      // 3. Stripe決済シートを初期化
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU, Inc.',
        paymentIntentClientSecret: paymentIntentClientSecret,
        merchantLocale: 'ja-JP',
      });
      if (initError) {
        throw new Error(initError.message);
      }

      // 4. 決済シートを表示
      const { error: presentError } = await presentPaymentSheet({
        locale: 'ja',
      });

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('決済エラー', presentError.message);
        }
        // 決済がキャンセルされたか失敗したので、ここで処理を終了
        setBuyingTicketId(null); // 👈 finallyブロックを待たずにボタンを戻す
        return;
      }

      // 5. 決済成功！ → すぐに「購入確定API」を呼び出す
      setBuyingTicketId(null); // 👈 UIを「処理中」から戻す
      Alert.alert(
        '決済完了',
        '決済が完了しました。チケットを確定しています...',
      );

      // ↓↓↓ 6. 購入確定APIの呼び出しを追記 ↓↓↓
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
            quantity: 1, // (handleBuyTicket の quantity と合わせる)
            stripe_payment_id: paymentIntentClientSecret, // 決済IDを送信
          }),
        },
      );

      const confirmData = await confirmResponse.json();
      if (!confirmResponse.ok) {
        // 決済は成功したが、在庫切れなどでDB登録に失敗した場合
        throw new Error(
          confirmData.message || 'チケットの確定に失敗しました。',
        );
      }

      // 7. ★★★ すべて完了 ★★★
      Alert.alert(
        '購入確定！',
        `「${ticket.name}」のチケット（${confirmData.tickets[0].seat_number}）を購入しました！`,
      );

      navigation.goBack(); // 詳細画面に戻る
    } catch (error: any) {
      Alert.alert('エラー', error.message);
      setBuyingTicketId(null); // 👈 エラー時もボタンを戻す
    }
    // (finallyブロックは不要になったので削除)
  };

  // dummyTickets は削除

  // リストの各アイテム
  const renderTicketItem = ({ item }: { item: TicketType }) => (
    <View style={styles.ticketItem}>
      <View>
        <Text style={styles.ticketName}>{item.name}</Text>
        <Text style={styles.ticketPrice}>¥{item.price.toLocaleString()}</Text>
      </View>
      <Button
        // 処理中のチケットIDと一致するかどうかで「処理中...」を制御
        title={buyingTicketId === item.id ? '処理中...' : '購入する'}
        onPress={() => handleBuyTicket(item)}
        // どれかが処理中なら、全ボタンを無効化
        disabled={buyingTicketId !== null}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* イベント詳細 */}
        <View style={styles.detailCard}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.venue}>{event.venue}</Text>
          <Text style={styles.date}>
            {new Date(event.event_date).toLocaleString('ja-JP')}
          </Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        {/* チケット選択 */}
        <Text style={styles.ticketHeader}>チケットを選択</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <FlatList
            data={tickets} // 👈 本物の tickets (State) を参照
            renderItem={renderTicketItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false} // ScrollViewの中なのでFlatListのスクロールは無効化
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイルシート ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
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
  venue: {
    fontSize: 18,
    color: '#BBBBBB',
    marginBottom: 5,
  },
  date: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  ticketHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 15,
    marginTop: 10,
    marginBottom: 10,
  },
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
  ticketName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ticketPrice: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 5,
  },
});

export default EventDetailScreen;
