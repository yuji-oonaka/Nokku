import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '../../../api/queries';

type Props = {
  order: Order;
};

const OrderBasicInfo: React.FC<Props> = ({ order }) => {
  const orderDate = new Date(order.created_at).toLocaleString('ja-JP');

  const paymentMethodText =
    order.payment_method === 'stripe' ? 'クレジットカード' : '会場での現金払い';

  const deliveryMethodText =
    order.delivery_method === 'mail' ? '郵送' : '会場受取り';

  // ステータス表示ロジック
  let statusText = '処理中';
  let statusStyle = styles.value_pending;

  if (order.status === 'pending') {
    statusText =
      order.payment_method === 'cash' ? '支払・受取待ち' : '支払処理中';
    statusStyle = styles.value_pending;
  } else if (order.status === 'paid' || order.status === 'shipped') {
    statusText = '支払い完了';
    statusStyle = styles.value_paid;
  } else if (order.status === 'redeemed') {
    statusText = '受取済み';
    statusStyle = styles.value_redeemed;
  }

  return (
    <View style={styles.infoSection}>
      <Text style={styles.groupTitle}>ご注文情報</Text>
      <View style={styles.infoBox}>
        <View style={styles.row}>
          <Text style={styles.label}>注文日時:</Text>
          <Text style={styles.value}>{orderDate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>注文ID:</Text>
          <Text style={styles.value}>#{order.id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ステータス:</Text>
          <Text style={[styles.value, statusStyle]}>{statusText}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>お支払い方法:</Text>
          <Text style={styles.value}>{paymentMethodText}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>お受取り方法:</Text>
          <Text style={styles.value}>{deliveryMethodText}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoSection: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  infoBox: { backgroundColor: '#333333', borderRadius: 8, padding: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: { color: '#AAA', fontSize: 16, flexShrink: 0, width: 110 },
  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  value_pending: { color: '#0A84FF', fontSize: 16, fontWeight: 'bold' },
  value_paid: { color: '#34C759', fontSize: 16, fontWeight: 'bold' },
  value_redeemed: { color: '#888', fontSize: 16, fontWeight: 'bold' },
});

export default OrderBasicInfo;
