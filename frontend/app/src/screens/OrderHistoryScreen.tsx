import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl, // ★追加
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';
import { useQuery } from '@tanstack/react-query';
import { Order, fetchMyOrders } from '../api/queries';

type OrderHistoryNavigationProp = StackNavigationProp<
  MyPageStackParamList,
  'OrderHistory'
>;

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation<OrderHistoryNavigationProp>();

  const {
    data: orders,
    isLoading,
    isError,
    refetch, // ★追加: 再取得用関数
    isRefetching, // ★追加: 再取得中フラグ
  } = useQuery({
    queryKey: ['myOrders'],
    queryFn: fetchMyOrders,
    staleTime: 1000 * 60 * 3,
  });

  // ★追加: 引っ張って更新時の処理
  const onRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderItem = ({ item }: { item: Order }) => {
    const firstItem = item.items[0];
    const firstItemName = firstItem?.product_name || '商品情報なし';
    const otherItemsCount = item.items.length - 1;
    const orderTitle = `${firstItemName}${
      otherItemsCount > 0 ? ` 他${otherItemsCount}点` : ''
    }`;

    // ★追加: アーティスト名の取得
    // OrderControllerで with('items.product.artist') しているので取得可能
    // 型定義によっては any 経由が必要な場合がありますが、APIからは返ってきています
    const artist = (firstItem as any)?.product?.artist;
    const artistName = artist?.nickname || artist?.real_name || 'アーティスト';

    const orderDate = new Date(item.created_at).toLocaleDateString('ja-JP');

    let statusText = '処理中';
    let statusStyle = styles.orderStatusPending;

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

    return (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => navigation.navigate('OrderDetail', { order: item })}
      >
        {/* 左側のテキストエリア */}
        <View style={styles.textContainer}>
          {/* ★追加: アーティスト名を表示 */}
          <Text style={styles.artistName} numberOfLines={1}>
            {artistName}
          </Text>

          <Text
            style={styles.orderTitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {orderTitle}
          </Text>
          <Text style={styles.orderDate}>{orderDate}</Text>
        </View>

        {/* 右側の詳細エリア */}
        <View style={styles.orderDetails}>
          <Text style={styles.orderPrice}>
            ¥{item.total_price.toLocaleString()}
          </Text>
          <Text style={[styles.orderStatusBase, statusStyle]}>
            {statusText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>注文履歴の取得に失敗しました。</Text>
        {/* エラー時もリトライできるようにボタンを表示 */}
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders || []}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>グッズの購入履歴はありません</Text>
          </View>
        }
        // ★追加: 引っ張って更新の設定
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#FFFFFF" // iOSのインジケーター色
            colors={['#7C4DFF']} // Androidのインジケーター色
          />
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
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  // ★追加: アーティスト名のスタイル
  artistName: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  orderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  orderDate: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  orderDetails: {
    alignItems: 'flex-end',
    minWidth: 90,
    flexShrink: 0,
  },
  orderPrice: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderStatusBase: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'right',
  },
  orderStatusPending: {
    color: '#0A84FF',
  },
  orderStatusPaid: {
    color: '#34C759',
  },
  orderStatusRedeemed: {
    color: '#888',
  },
  retryButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  retryText: {
    color: '#FFF',
  },
});

export default OrderHistoryScreen;
