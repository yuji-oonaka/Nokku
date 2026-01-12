import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Order } from '../../../api/queries';

type OrderHistoryItemProps = {
  item: Order;
  onPress: (order: Order) => void;
};

const OrderHistoryItem: React.FC<OrderHistoryItemProps> = ({
  item,
  onPress,
}) => {
  const firstItem = item.items[0];
  const firstItemName = firstItem?.product_name || '商品情報なし';
  const otherItemsCount = item.items.length - 1;

  const orderTitle = `${firstItemName}${
    otherItemsCount > 0 ? ` 他${otherItemsCount}点` : ''
  }`;

  // アーティスト情報の取得 (APIレスポンス構造に依存)
  // 型定義でカバーしきれていない場合のために安全策をとっています
  const artist = (firstItem as any)?.product?.artist;
  const artistName = artist?.nickname || artist?.real_name || 'アーティスト';

  const orderDate = new Date(item.created_at).toLocaleDateString('ja-JP');

  // ステータス表示ロジック
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
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* 左側のテキストエリア */}
      <View style={styles.textContainer}>
        <Text style={styles.artistName} numberOfLines={1}>
          {artistName}
        </Text>

        <Text style={styles.orderTitle} numberOfLines={2} ellipsizeMode="tail">
          {orderTitle}
        </Text>
        <Text style={styles.orderDate}>{orderDate}</Text>
      </View>

      {/* 右側の詳細エリア */}
      <View style={styles.orderDetails}>
        <Text style={styles.orderPrice}>
          ¥{item.total_price.toLocaleString()}
        </Text>
        <Text style={[styles.orderStatusBase, statusStyle]}>{statusText}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});

export default OrderHistoryItem;
