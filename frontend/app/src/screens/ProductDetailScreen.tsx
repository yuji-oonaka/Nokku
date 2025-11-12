// C:\Nokku\frontend\app\src\screens\ProductDetailScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../navigators/ProductStackNavigator';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
// 1. ★ useStripe と useAuth をインポート
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../context/AuthContext';

// --- (Product, 型定義は変更なし) ---
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
}
// 2. ナビゲーションの型
type ProductDetailRouteProp = RouteProp<ProductStackParamList, 'ProductDetail'>;

// --- 型定義 (内部用) ---
type PaymentMethod = 'stripe' | 'cash';
type DeliveryMethod = 'mail' | 'venue';

const ProductDetailScreen: React.FC = () => {
  // --- 1. Hooks ---
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { productId } = route.params;

  // 2. ★ 必要なHooksを呼び出し
  const { user } = useAuth(); // 住所チェック用
  const { initPaymentSheet, presentPaymentSheet } = useStripe(); // 決済用

  // --- 2. State ---
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true); // 商品読み込み中
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false); // ★ 購入処理中

  // 3. ★ 選択用の State を追加
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('mail');

  // --- 3. データ取得 (変更なし) ---
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await api.get<Product>(`/products/${productId}`);
        setProduct(response.data);
      } catch (error) {
        console.error('商品詳細の取得エラー:', error);
        Alert.alert('エラー', '商品情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // --- 4. 個数処理 (変更なし) ---
  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(prevQuantity => prevQuantity + 1);
    }
  };
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prevQuantity => prevQuantity - 1);
    }
  };

  // --- 5. ★ 購入ボタンのメイン処理 (handlePurchasePress を置き換え) ---
  const handleCreateOrder = async () => {
    if (!product || !user) return; // 商品かユーザーが未読み込み

    // 5-a. ★ 住所バリデーション (フロント側)
    if (
      deliveryMethod === 'mail' &&
      (!user.postal_code ||
        !user.prefecture ||
        !user.city ||
        !user.address_line1)
    ) {
      Alert.alert(
        '住所がありません',
        '「郵送」を選択するには、先にマイページからプロフィール（配送先住所）を登録してください。',
        [
          { text: '閉じる' },
          {
            text: 'プロフィールへ',
            onPress: () =>
              navigation.navigate('MyPageStack', { screen: 'ProfileEdit' }),
          },
        ],
      );
      return;
    }

    setIsProcessing(true);

    try {
      // 5-b. ★ バックエンド (OrderController@store) に注文リクエスト
      const response = await api.post('/orders', {
        product_id: product.id,
        quantity: quantity,
        payment_method: paymentMethod,
        delivery_method: deliveryMethod,
      });

      const { clientSecret } = response.data; // Stripe決済用の秘密キー

      // 5-c. ★ 決済方法によって処理を分岐
      if (paymentMethod === 'stripe') {
        // --- クレジットカード決済 ---
        if (!clientSecret) {
          throw new Error(
            '決済の準備に失敗しました (clientSecretがありません)',
          );
        }

        // 5-c-1. Stripeシートを初期化
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'NOKKU, Inc.',
          paymentIntentClientSecret: clientSecret,
        });
        if (initError) {
          console.error('initPaymentSheet error:', initError);
          throw new Error('決済シートの初期化に失敗しました。');
        }

        // 5-c-2. Stripeシートを表示
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') {
            Alert.alert('キャンセル', '決済がキャンセルされました。');
          } else {
            throw new Error(`決済に失敗しました: ${presentError.message}`);
          }
        } else {
          // ★ 決済成功 ★
          Alert.alert('購入完了', 'ありがとうございます。購入が完了しました。');
          navigation.goBack(); // (または購入履歴画面へ)
        }
      } else {
        // --- 現金払い (会場受取り) ---
        // (APIは成功しているので、ここでは完了を通知するだけ)
        Alert.alert(
          '予約完了',
          '会場での受け取り・お支払いの準備ができました。',
        );
        navigation.goBack(); // (または購入履歴画面へ)
      }
    } catch (err: any) {
      // 5-d. ★ エラーハンドリング
      console.error('注文作成エラー:', err.response?.data || err.message);
      // バックエンドからのバリデーションエラー (在庫不足、住所未登録など)
      const message =
        err.response?.data?.message ||
        err.message ||
        '注文処理中にエラーが発生しました。';
      Alert.alert('注文エラー', message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 6. ヘルパー変数 (JSX描画用) ---
  const isSoldOut = product ? product.stock <= 0 : false;
  const totalPrice = (product?.price || 0) * quantity;

  // 6-a. ★ 住所が登録されているか
  const isAddressComplete =
    user &&
    user.postal_code &&
    user.prefecture &&
    user.city &&
    user.address_line1;

  // 6-b. ★ 購入ボタンを無効化する条件
  const isPurchaseDisabled =
    isSoldOut ||
    isProcessing || // 処理中
    (deliveryMethod === 'mail' && !isAddressComplete); // 郵送なのに住所がない

  // --- 7. ローディング表示 ---
  if (loading || !user) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  // --- 8. メイン描画 ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* --- 商品情報 (変更なし) --- */}
        {product?.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder]} />
        )}
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product?.name}</Text>
          <Text style={styles.productPrice}>
            ¥{product?.price.toLocaleString()}
          </Text>
          <Text style={styles.productStock}>
            {isSoldOut ? '在庫切れ' : `在庫: ${product?.stock}`}
          </Text>
          <Text style={styles.productDescription}>{product?.description}</Text>
        </View>

        {/* --- 個数選択 (変更なし) --- */}
        {!isSoldOut && (
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>数量:</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={decrementQuantity}
              disabled={quantity <= 1}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={incrementQuantity}
              disabled={product ? quantity >= product.stock : false}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- 9. ★★★ ここからが新しいUI ★★★ --- */}
        {!isSoldOut && (
          <View style={styles.optionsSection}>
            {/* 9-a. お受取り方法 */}
            <Text style={styles.groupTitle}>お受取り方法</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  deliveryMethod === 'mail' && styles.optionButtonSelected,
                ]}
                onPress={() => setDeliveryMethod('mail')}
              >
                <Text style={styles.optionButtonText}>郵送</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  deliveryMethod === 'venue' && styles.optionButtonSelected,
                ]}
                onPress={() => setDeliveryMethod('venue')}
              >
                <Text style={styles.optionButtonText}>会場受取り</Text>
              </TouchableOpacity>
            </View>

            {/* 9-b. 住所 (郵送が選択された時のみ表示) */}
            {deliveryMethod === 'mail' && (
              <View style={styles.addressContainer}>
                <Text style={styles.addressLabel}>配送先住所:</Text>
                {isAddressComplete ? (
                  // 住所が登録されている場合
                  <View style={styles.addressBox}>
                    <Text style={styles.addressText}>〒{user.postal_code}</Text>
                    <Text style={styles.addressText}>
                      {user.prefecture} {user.city}
                    </Text>
                    <Text style={styles.addressText}>{user.address_line1}</Text>
                    {user.address_line2 && (
                      <Text style={styles.addressText}>
                        {user.address_line2}
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('MyPageStack', {
                          screen: 'ProfileEdit',
                        })
                      }
                    >
                      <Text style={styles.addressChangeLink}>変更する</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // 住所が未登録の場合
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      配送先住所が未登録です。
                    </Text>
                    <TouchableOpacity
                      style={styles.warningButton}
                      onPress={() =>
                        navigation.navigate('MyPageStack', {
                          screen: 'ProfileEdit',
                        })
                      }
                    >
                      <Text style={styles.warningButtonText}>
                        プロフィールを登録
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 9-c. お支払い方法 */}
            <Text style={styles.groupTitle}>お支払い方法</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  paymentMethod === 'stripe' && styles.optionButtonSelected,
                ]}
                onPress={() => setPaymentMethod('stripe')}
              >
                <Text style={styles.optionButtonText}>クレジットカード</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  paymentMethod === 'cash' && styles.optionButtonSelected,
                ]}
                // 郵送（mail）の場合は現金（cash）を選べないようにする
                disabled={deliveryMethod === 'mail'}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    deliveryMethod === 'mail' &&
                      styles.optionButtonDisabledText,
                  ]}
                >
                  会場での現金払い
                </Text>
              </TouchableOpacity>
            </View>
            {deliveryMethod === 'mail' && (
              <Text style={styles.infoText}>
                ※郵送の場合はクレジットカードのみご利用いただけます。
              </Text>
            )}

            {/* 9-d. 合計金額 */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>合計金額:</Text>
              <Text style={styles.totalPrice}>
                ¥{totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        )}
        {/* --- ★★★ 新しいUIここまで ★★★ --- */}

        {/* 10. ★ 購入ボタンを修正 (処理中と住所未登録も考慮) */}
        <View style={styles.buttonContainer}>
          {isProcessing ? (
            <ActivityIndicator size="large" color="#0A84FF" />
          ) : (
            <Button
              title={isSoldOut ? '売り切れ' : '注文を確定する'}
              onPress={handleCreateOrder} // ★ 呼び出す関数を変更
              disabled={isPurchaseDisabled}
              color="#0A84FF"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイル (大幅に追加) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: { color: '#FF3B30', fontSize: 16 },
  productImage: { width: '100%', height: 300, resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: '#333' },
  infoContainer: { padding: 20, paddingBottom: 0 }, // 下の余白を削除
  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 22,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 10,
  },
  productStock: { fontSize: 16, color: '#888888', marginBottom: 20 },
  productDescription: { fontSize: 16, color: '#BBBBBB', lineHeight: 24 },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  quantityLabel: { color: '#FFFFFF', fontSize: 18, marginRight: 15 },
  quantityButton: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  quantityValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40, // スクロール下部の余白
  },

  // --- ↓↓↓ ここからが新しいスタイル ↓↓↓ ---
  optionsSection: {
    padding: 20,
    paddingTop: 10,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  optionButtonSelected: {
    borderColor: '#0A84FF',
    backgroundColor: '#0A84FF20', // 青色の薄い背景
  },
  optionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  optionButtonDisabledText: {
    color: '#555', // 無効化されたテキスト
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    paddingHorizontal: 5,
    marginTop: -15, // ボタンのすぐ下に配置
    marginBottom: 20,
  },
  addressContainer: {
    marginBottom: 20,
  },
  addressLabel: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  addressBox: {
    backgroundColor: '#1C1C1E',
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  addressChangeLink: {
    color: '#0A84FF',
    fontSize: 16,
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  warningBox: {
    backgroundColor: '#FF3B3020', // 赤色の薄い背景
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  warningText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 15,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalPrice: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;
