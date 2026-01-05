import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import api from '../../services/api';
import { ProductStackParamList } from '../../navigators/ProductStackNavigator';
// ★ SoundService を復活
import SoundService from '../../services/SoundService';

type PaymentScreenRouteProp = RouteProp<ProductStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentScreenRouteProp>();
  const { product, quantity } = route.params;

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'mail' | 'venue'>(
    'mail',
  );
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash'>(
    'stripe',
  );

  useEffect(() => {
    if (deliveryMethod === 'mail') {
      setPaymentMethod('stripe');
    }
  }, [deliveryMethod]);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // 1. Backend API で注文作成
      const response = await api.post('/orders', {
        product_id: product.id,
        quantity: quantity,
        payment_method: paymentMethod,
        delivery_method: deliveryMethod,
      });

      const { clientSecret } = response.data;

      // 2. Stripe決済フロー
      if (paymentMethod === 'stripe') {
        if (!clientSecret) {
          throw new Error('決済情報の取得に失敗しました');
        }

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'NOKKU, Inc.',
          paymentIntentClientSecret: clientSecret,
          defaultBillingDetails: {
            name: 'NOKKU User',
          },
        });
        if (initError)
          throw new Error(`決済初期化エラー: ${initError.message}`);

        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code === 'Canceled') return;
          throw new Error(presentError.message);
        }
      }

      // ★★★ 3. 成功音を再生 ★★★
      SoundService.playSuccess();

      // 4. 完了アラート
      const isCash = paymentMethod === 'cash';
      const title = isCash ? '予約完了' : '購入完了';
      const message = isCash
        ? '会場での受け取り・お支払いの準備ができました。'
        : 'ご注文ありがとうございます！決済が完了しました。';

      Alert.alert(title, message, [
        {
          text: 'OK',
          onPress: () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'ProductList' }],
              }),
            );
          },
        },
      ]);
    } catch (err: any) {
      if (err.message === 'Canceled') return;

      // ★★★ エラー音を再生 ★★★
      SoundService.playError();

      const message =
        err.response?.data?.message ||
        err.message ||
        '注文処理に失敗しました。';
      Alert.alert('注文エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>処理中...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>ご注文内容の確認</Text>

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
            <Text style={styles.totalAmount}>
              ¥{(product.price * quantity).toLocaleString()}
            </Text>
          </View>
        </View>

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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.checkoutButton, loading && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={loading}
          >
            <Text style={styles.checkoutButtonText}>
              {paymentMethod === 'cash' ? '予約を確定する' : '注文を確定する'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
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
  footer: { marginTop: 10 },
  checkoutButton: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#555' },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});

export default PaymentScreen;
