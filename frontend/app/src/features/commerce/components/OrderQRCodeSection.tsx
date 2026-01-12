import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Order } from '../../../api/queries';

type Props = {
  order: Order;
};

const OrderQRCodeSection: React.FC<Props> = ({ order }) => {
  // 会場受取以外、またはQRがない場合は表示しない
  if (order.delivery_method !== 'venue' || !order.qr_code_id) return null;

  return (
    <View style={styles.qrSection}>
      <Text style={styles.groupTitle}>会場受取り用 QRコード</Text>

      <View style={styles.qrContainer}>
        {order.status === 'redeemed' ? (
          <View style={styles.redeemedContainer}>
            <Text style={styles.checkIcon}>✅</Text>
            <Text style={styles.redeemedText}>受取済み</Text>
          </View>
        ) : (
          <QRCode
            value={order.qr_code_id}
            size={200}
            backgroundColor="white"
            color="black"
          />
        )}
      </View>

      <Text style={styles.infoText}>
        {order.status === 'redeemed'
          ? 'この注文は受け取り済みです。'
          : 'このQRコードを会場のスタッフに提示してください。'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  qrSection: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  qrContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 200,
  },
  redeemedContainer: { alignItems: 'center', justifyContent: 'center' },
  checkIcon: { fontSize: 50, color: '#FFF' },
  redeemedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
    marginTop: 10,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default OrderQRCodeSection;
