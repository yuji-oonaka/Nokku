import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native'; // 👈 Stripeのフック
import { useNavigation, useRoute } from '@react-navigation/native'; // 👈 画面遷移とパラメータ取得

const API_URL = 'http://10.0.2.2';

// Productの型（簡易版）
interface Product {
  id: number;
  name: string;
  price: number;
}

// App.tsxから渡される認証トークン
// （この画面もタブナビゲーターの子になるため）
interface Props {
  authToken: string;
}

const PaymentScreen: React.FC<Props> = ({ authToken }) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe(); // 👈 Stripeの決済シート機能
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();
  const route = useRoute(); // 👈 前の画面から渡されたパラメータを取得

  // 前の画面（ProductListScreen）から渡された商品情報を取得
  const { product } = route.params as { product: Product };
  const quantity = 1; // （簡単のため、購入数量は1で固定）

  /**
   * 決済シートを初期化する
   * （画面読み込み時、または「購入」ボタンが押された時に実行）
   */
  const initializePaymentSheet = async () => {
    try {
      // 1. バックエンドに決済ID（Payment Intent）をリクエスト
      const response = await fetch(`${API_URL}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: quantity,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '決済の準備に失敗しました');
      }

      const { clientSecret, amount } = data;

      // 2. Stripe決済シートを初期化
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'NOKKU, Inc.',
        paymentIntentClientSecret: clientSecret,
        // (オプション) Google Pay / Apple Pay
        // allowsDelayedPaymentMethods: true,
        merchantLocale: 'ja-JP',
      });

      if (error) {
        throw new Error(error.message);
      }

      return true; // 準備完了
    } catch (error: any) {
      Alert.alert('エラー (init)', error.message);
      return false; // 準備失敗
    }
  };

  /**
   * 「購入する」ボタンが押された時の処理
   */
  const handleCheckout = async () => {
    setLoading(true);

    // 1. 決済シートを初期化（最新の決済IDを取得）
    const initialized = await initializePaymentSheet();
    if (!initialized) {
      setLoading(false);
      return; // 初期化失敗
    }

    // 2. 決済シートを表示（カード入力画面）
    const { error } = await presentPaymentSheet({
      locale: 'ja', // ← 🎯 この1行を追記
    });

    if (error) {
      if (error.code !== 'Canceled') {
        Alert.alert('決済エラー', error.message);
      }
    } else {
      // 3. 決済成功
      Alert.alert(
        '決済完了',
        'ありがとうございます！グッズの購入が完了しました。',
      );
      // 成功したら、タブの一覧画面に戻る
      navigation.navigate('Products');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>購入確認</Text>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.quantity}>数量: {quantity}</Text>
        <Text style={styles.amount}>
          合計金額: ¥{(product.price * quantity).toLocaleString()}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title={loading ? '処理中...' : '購入する'}
          onPress={handleCheckout}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 20,
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
  },
});

export default PaymentScreen;
