import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import api from '../services/api';

// ★ ProductStackNavigator の型をインポート
import { ProductStackParamList } from '../navigators/ProductStackNavigator';

// --- 型定義 ---
interface Product {
  id: number;
  name: string;
  price: number;
}

type PaymentScreenRouteProp = RouteProp<ProductStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation();
  const route = useRoute<PaymentScreenRouteProp>();
  const { product, quantity } = route.params;

  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);

  // --- 支払いシート初期化 ---
  useEffect(() => {
    const initializePaymentSheet = async () => {
      setLoading(true);
      try {
        const response = await api.post('/create-payment-intent', {
          product_id: product.id,
          quantity: quantity, // 👈 '1' ではなく、渡された 'quantity' を使う
        });

        const { clientSecret } = response.data;
        if (!clientSecret) {
          throw new Error(
            '決済の準備に失敗しました（clientSecret がありません）',
          );
        }

        const { error } = await initPaymentSheet({
          merchantDisplayName: 'NOKKU, Inc.',
          paymentIntentClientSecret: clientSecret,
        });

        if (error) throw new Error(error.message);
        setPaymentReady(true);
      } catch (err: any) {
        const message =
          err.response?.data?.message ||
          err.message ||
          '決済の準備に失敗しました。';
        Alert.alert('エラー (初期化)', message);
      } finally {
        setLoading(false);
      }
    };

    initializePaymentSheet();
  }, [product.id, quantity, initPaymentSheet]);

  // --- 決済処理 ---
  const handleCheckout = async () => {
    setLoading(true);
    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code !== 'Canceled') {
        Alert.alert('決済エラー', error.message);
      }
    } else {
      Alert.alert('決済完了', 'ありがとうございます！購入が完了しました。');
      navigation.goBack();
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ローディングオーバーレイ */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {/* カード表示 */}
      <View style={styles.card}>
        <Text style={styles.title}>購入確認</Text>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.quantity}>数量: {quantity}</Text>
        <Text style={styles.amount}>
          合計金額: ¥{(product.price * quantity).toLocaleString()}
        </Text>
      </View>

      {/* カスタム購入ボタン */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            (!paymentReady || loading) && styles.buttonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={!paymentReady || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '処理中...' : '購入する'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- スタイル定義 ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 20,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  productName: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  quantity: {
    fontSize: 16,
    color: '#BBBBBB',
    marginBottom: 10,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: 30,
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;
