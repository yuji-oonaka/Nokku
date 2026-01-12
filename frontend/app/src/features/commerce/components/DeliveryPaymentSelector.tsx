import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type DeliveryMethod = 'mail' | 'venue';
export type PaymentMethod = 'stripe' | 'cash';

type DeliveryPaymentSelectorProps = {
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
};

const DeliveryPaymentSelector: React.FC<DeliveryPaymentSelectorProps> = ({
  deliveryMethod,
  setDeliveryMethod,
  paymentMethod,
  setPaymentMethod,
}) => {
  return (
    <>
      {/* 受取方法 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>受取方法</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              deliveryMethod === 'mail' && styles.optionSelected,
            ]}
            onPress={() => setDeliveryMethod('mail')}
          >
            <Text style={styles.optionText}>郵送</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              deliveryMethod === 'venue' && styles.optionSelected,
            ]}
            onPress={() => setDeliveryMethod('venue')}
          >
            <Text style={styles.optionText}>会場受取</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* お支払い方法 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>お支払い方法</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              paymentMethod === 'stripe' && styles.optionSelected,
            ]}
            onPress={() => setPaymentMethod('stripe')}
          >
            <Text style={styles.optionText}>カード</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              paymentMethod === 'cash' && styles.optionSelected,
              deliveryMethod === 'mail' && styles.optionDisabled,
            ]}
            onPress={() => setPaymentMethod('cash')}
            disabled={deliveryMethod === 'mail'}
          >
            <Text
              style={[
                styles.optionText,
                deliveryMethod === 'mail' && styles.optionTextDisabled,
              ]}
            >
              会場現金
            </Text>
          </TouchableOpacity>
        </View>
        {deliveryMethod === 'mail' && (
          <Text style={styles.noteText}>
            ※郵送の場合はカード決済のみとなります。
          </Text>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  optionSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  optionDisabled: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  optionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  optionTextDisabled: { color: '#555' },
  noteText: { color: '#E53935', fontSize: 12, marginTop: 8 },
});

export default DeliveryPaymentSelector;
