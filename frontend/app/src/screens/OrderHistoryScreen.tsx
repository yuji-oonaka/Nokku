import React from 'react'; // 1. ★ useState, useCallback, useFocusEffect を削除
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  // Alert, // 2. ★ Alert は isError で処理
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// 3. ★ api.ts は不要
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';

// 4. ★ React Query と、queries.ts から型・関数をインポート
import { useQuery } from '@tanstack/react-query';
import { Order, fetchMyOrders } from '../api/queries';

type OrderHistoryNavigationProp = StackNavigationProp<
  MyPageStackParamList,
  'OrderHistory'
>;

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation<OrderHistoryNavigationProp>();

  // 5. ★ (DELETE) useState(orders), useState(loading) を削除
  // 6. ★ (DELETE) fetchOrders (useCallback) を削除
  // 7. ★ (DELETE) useFocusEffect を削除

  // 8. ★ (NEW) React Query で /my-orders を取得
  const {
    data: orders, // 取得したデータ (Order[] | undefined)
    isLoading, // 初回ロード中
    isError, // エラー発生時
  } = useQuery({
    queryKey: ['myOrders'], // キャッシュキー
    queryFn: fetchMyOrders,
    staleTime: 1000 * 60 * 3, // 3分間はキャッシュを優先
  });

  // 9. ★ リストの各アイテムを描画 (ロジックはほぼ変更なし)
  const renderItem = ({ item }: { item: Order }) => {
    const firstItemName = item.items[0]?.product_name || '商品情報なし';
    const otherItemsCount = item.items.length - 1;
    const orderTitle = `${firstItemName}${
      otherItemsCount > 0 ? ` 他${otherItemsCount}点` : ''
    }`;

    const orderDate = new Date(item.created_at).toLocaleDateString('ja-JP');

    // 10. ★ (BUG FIX) ステータス表示のロジック (ここは元のままでOK)
    let statusText = '処理中';
    let statusStyle = styles.orderStatusPending; // デフォルトは青

    if (item.status === 'pending') {
      if (item.payment_method === 'cash') {
        statusText = '支払・受取待ち';
      } else {
        statusText = '支払処理中';
      }
      statusStyle = styles.orderStatusPending;
    } else if (item.status === 'paid' || item.status === 'shipped') {
      statusText = '支払い完了';
      statusStyle = styles.orderStatusPaid;
    } else if (item.status === 'redeemed') {
      statusText = '受取済み';
      statusStyle = styles.orderStatusRedeemed;
    }
    // (もし 'cancelled' などの他ステータスもあれば、ここに追加)

    return (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => navigation.navigate('OrderDetail', { order: item })}
      >
        <View>
          <Text style={styles.orderTitle}>{orderTitle}</Text>
          <Text style={styles.orderDate}>{orderDate}</Text>
        </View>
        <View style={styles.orderDetails}>
          <Text style={styles.orderPrice}>
            ¥{item.total_price.toLocaleString()}
          </Text>
          {/* 11. ★ (BUG FIX) item.status -> statusText と statusStyle を使う */}
          <Text style={[styles.orderStatusBase, statusStyle]}>
            {statusText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 12. ★ (MODIFY) ローディング判定を 'isLoading' に変更
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  // 13. ★ (NEW) エラー表示
  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>注文履歴の取得に失敗しました。</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders || []} // 14. ★ (MODIFY) data は {orders || []}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>グッズの購入履歴はありません</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  orderItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  orderDate: {
    color: '#888',
    fontSize: 14,
    marginTop: 5,
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderPrice: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 15. ★ (NEW) ステータスの共通スタイル
  orderStatusBase: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  // 16. ★ (RENAME) orderStatus -> orderStatusPending
  orderStatusPending: {
    color: '#0A84FF', // 青
  },
  orderStatusPaid: {
    color: '#34C759', // 緑
  },
  orderStatusRedeemed: {
    color: '#888', // グレー
  },
});

export default OrderHistoryScreen;
