import React, { useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import api from '../../services/api';

// ★ ProductStackNavigator の型をインポート
import { ProductStackParamList } from '../../navigators/ProductStackNavigator';

// --- 型定義 ---
type PaymentScreenRouteProp = RouteProp<ProductStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentScreenRouteProp>();
  const { product, quantity } = route.params;

  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'mail' | 'venue'>(
    'mail',
  );
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash'>(
    'stripe',
  );

  // --- 注文確定処理 ---
  // 画面ロード時には何もしない。ボタンを押したときだけ実行。
  const handlePurchase = async () => {
    setLoading(true);
    try {
      // 1. Backendの堅牢なAPIを叩く (排他制御・決済・注文作成すべて入り)
      const response = await api.post('/orders', {
        product_id: product.id,
        quantity: quantity,
        payment_method: paymentMethod,
        delivery_method: deliveryMethod,
      });

      // 2. 成功した場合の処理
      const { order, clientSecret } = response.data;

      // ※本来はここでStripe SDKを使って決済確定フローを入れるが、
      // 今回のBackend実装では自動決済(PaymentIntent)まで行っている想定のため、
      // 成功が返ってくれば注文完了とみなす。
      // (より厳密にするなら confirmPaymentSheetPayment を使うが、まずは基本動線を通す)

      Alert.alert('購入完了', 'ご注文ありがとうございます！', [
        {
          text: 'OK',
          onPress: () => {
            // 3. 履歴スタックをリセットして「商品一覧」または「注文履歴」へ戻す
            // (戻るボタン連打で決済画面に戻れないようにする対策)
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'ProductList' }], // または OrderHistory
              }),
            );
            // 必要なら OrderHistory へ遷移させる
            // navigation.navigate('OrderHistory' as never);
          },
        },
      ]);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        '注文処理に失敗しました。';
      Alert.alert('購入エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ローディングオーバーレイ */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>処理中...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>ご注文内容の確認</Text>

        {/* 商品情報カード */}
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

        {/* 配送方法選択 (簡易UI) */}
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

        {/* 支払い方法選択 (簡易UI) */}
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
              <Text style={styles.optionText}>カード (Stripe)</Text>
            </TouchableOpacity>
            {/* 現地決済などのオプションがあればここに追加 */}
          </View>
        </View>

        {/* 購入確定ボタン */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.checkoutButton, loading && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={loading}
          >
            <Text style={styles.checkoutButtonText}>注文を確定する</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイル定義 ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
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
  label: {
    color: '#AAAAAA',
    fontSize: 16,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    color: '#4CAF50', // 金額を目立たせる色
    fontSize: 22,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  optionSelected: {
    backgroundColor: '#007AFF', // 選択時の色
    borderColor: '#007AFF',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 10,
  },
  checkoutButton: {
    backgroundColor: '#E53935', // 確定ボタンは目立つ色(赤など)
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#555',
    shadowOpacity: 0,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;
