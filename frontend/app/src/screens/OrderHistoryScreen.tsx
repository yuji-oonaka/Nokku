import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
// 1. ★ MyPageStackNavigator の型をインポート (後で修正します)
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';
import { Order, OrderItem } from '../screens/OrderDetailScreen';

// 3. ★ ナビゲーションの型
type OrderHistoryNavigationProp = StackNavigationProp<
  MyPageStackParamList,
  'OrderHistory'
>;

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation<OrderHistoryNavigationProp>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 4. ★ APIから注文履歴を取得
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Order[]>('/my-orders');
      setOrders(response.data);
    } catch (error) {
      console.error('注文履歴の取得エラー:', error);
      Alert.alert('エラー', '注文履歴の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. ★ 画面が表示されるたびに履歴を再取得
  useFocusEffect(
    useCallback(() => {
      // useFocusEffect 内で async 関数を呼び出すためのラッパー
      const loadData = async () => {
        await fetchOrders();
      };

      loadData(); // 実行

      // (クリーンアップ関数は不要な場合は何も返さない)
    }, [fetchOrders]), // fetchOrders (useCallback) が変わった時だけ再実行
  );

  // 6. ★ リストの各アイテムを描画
  const renderItem = ({ item }: { item: Order }) => {
    // 注文に含まれる最初の商品の名前 (または「他X件」)
    const firstItemName = item.items[0]?.product_name || '商品情報なし';
    const otherItemsCount = item.items.length - 1;
    const orderTitle = `${firstItemName}${
      otherItemsCount > 0 ? ` 他${otherItemsCount}点` : ''
    }`;

    // 注文日をフォーマット
    const orderDate = new Date(item.created_at).toLocaleDateString('ja-JP');

    return (
      <TouchableOpacity
        style={styles.orderItem}
        // 7. ★ (次のステップ) OrderDetail 画面へ遷移
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
          <Text style={styles.orderStatus}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
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
  orderStatus: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
});

export default OrderHistoryScreen;
