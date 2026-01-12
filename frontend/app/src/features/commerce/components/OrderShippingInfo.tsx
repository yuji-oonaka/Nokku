import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '../../../api/queries';

type Props = {
  order: Order;
};

const OrderShippingInfo: React.FC<Props> = ({ order }) => {
  if (order.delivery_method !== 'mail' || !order.shipping_address) return null;

  const { postal_code, prefecture, city, address_line1, address_line2, name } =
    order.shipping_address;

  return (
    <View style={styles.infoSection}>
      <Text style={styles.groupTitle}>配送先住所</Text>
      <View style={styles.infoBox}>
        <Text style={styles.addressText}>〒{postal_code}</Text>
        <Text style={styles.addressText}>
          {prefecture} {city}
        </Text>
        <Text style={styles.addressText}>{address_line1}</Text>
        {address_line2 && (
          <Text style={styles.addressText}>{address_line2}</Text>
        )}
        <Text style={styles.infoText_small}>( {name || ''} 様 )</Text>
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
  addressText: { color: '#FFFFFF', fontSize: 16, lineHeight: 24 },
  infoText_small: { color: '#AAA', fontSize: 14, marginTop: 10 },
});

export default OrderShippingInfo;
