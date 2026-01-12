import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Product } from '../../../api/queries';

type OrderSummaryProps = {
  product: Pick<Product, 'name' | 'price'>;
  quantity: number;
};

const OrderSummary: React.FC<OrderSummaryProps> = ({ product, quantity }) => {
  const totalAmount = product.price * quantity;

  return (
    <View style={styles.card}>
      <Text style={styles.productName}>{product.name}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>単価</Text>
        <Text style={styles.value}>¥{product.price.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>数量</Text>
        <Text style={styles.value}>{quantity} 点</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>合計金額</Text>
        <Text style={styles.totalAmount}>¥{totalAmount.toLocaleString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { color: '#AAAAAA', fontSize: 16 },
  value: { color: '#FFFFFF', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 12 },
  totalLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  totalAmount: { color: '#4CAF50', fontSize: 22, fontWeight: 'bold' },
});

export default OrderSummary;
