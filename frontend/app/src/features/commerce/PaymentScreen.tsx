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
import SoundService from '../../services/SoundService';

// コンポーネントのインポート
import OrderSummary from './components/OrderSummary';
import DeliveryPaymentSelector, {
  DeliveryMethod,
  PaymentMethod,
} from './components/DeliveryPaymentSelector';

type PaymentScreenRouteProp = RouteProp<ProductStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentScreenRouteProp>();
  const { product, quantity } = route.params;

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('mail');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');

  // 郵送選択時に支払方法をStripeに強制するロジック
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

      // 3. 成功処理
      SoundService.playSuccess();

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

        {/* 注文概要コンポーネント */}
        <OrderSummary product={product} quantity={quantity} />

        {/* 受取・支払方法選択コンポーネント */}
        <DeliveryPaymentSelector
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
        />

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
