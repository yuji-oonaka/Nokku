import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '../../../api/queries';

type Props = {
  order: Order;
};

const OrderItemsList: React.FC<Props> = ({ order }) => {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.groupTitle}>注文明細</Text>
      <View style={styles.infoBox}>
        {order.items.map(item => (
          <View style={styles.itemRow} key={item.id}>
            <Text style={styles.itemName}>
              {item.product_name} (x {item.quantity})
            </Text>
            <Text style={styles.itemPrice}>
              ¥{(item.price_at_purchase * item.quantity).toLocaleString()}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>合計金額</Text>
          <Text style={styles.totalPrice}>
            ¥{order.total_price.toLocaleString()}
          </Text>
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  itemName: { color: '#FFFFFF', fontSize: 16, flex: 1 },
  itemPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 10,
  },
  totalLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  totalPrice: { color: '#4CAF50', fontSize: 20, fontWeight: 'bold' },
});

export default OrderItemsList;
