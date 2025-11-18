import React, { useState, useCallback } from 'react'; // 1. ★ useEffect は不要に
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
  RefreshControl, // 2. ★ RefreshControl をインポート
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../navigators/ProductStackNavigator';
import api from '../services/api'; // (mutation でまだ使う)
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../context/AuthContext';

// 3. ★ React Query と新しい型/関数をインポート
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Product, fetchProductById } from '../api/queries';

// --- 型定義 ---
type ProductDetailRouteProp = RouteProp<ProductStackParamList, 'ProductDetail'>;
type PaymentMethod = 'stripe' | 'cash';
type DeliveryMethod = 'mail' | 'venue';

const ProductDetailScreen: React.FC = () => {
  // --- 1. Hooks ---
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { productId } = route.params;

  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient(); // 4. ★ QueryClient を取得

  // --- 2. State (UI操作用の State は残す) ---
  // (product, loading state は useQuery が管理)
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('mail');
  // (isProcessing state は useMutation が管理)

  // --- 3. データ取得 (useQuery) ---
  // 5. ★ useEffect, useState(product), useState(loading) を useQuery に置き換え
  // 2. ★ (NEW) 手動スワイプ中だけを管理する state
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // --- 3. データ取得 (useQuery) ---
  const {
    data: product,
    isLoading,
    // 3. ★ isRefetching は RefreshControl では "使わない"
    // (ただし、裏で動いていることを知るために変数自体は受け取っておく)
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId),
    enabled: !!productId,
  });

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

  // --- 5. ★ 購入処理 (useMutation) ---
  // 6. ★ useState(isProcessing) の代わりに useMutation を使用
  const createOrderMutation = useMutation({
    // 7. ★ mutationFn: API呼び出しとStripe処理の "全体"
    mutationFn: async (orderData: {
      productId: number;
      quantity: number;
      paymentMethod: PaymentMethod;
      deliveryMethod: DeliveryMethod;
    }) => {
      // 5-b. (旧 handleCreateOrder の try ブロック)
      const response = await api.post('/orders', {
        product_id: orderData.productId,
        quantity: orderData.quantity,
        payment_method: orderData.paymentMethod,
        delivery_method: orderData.deliveryMethod,
      });

      const { clientSecret } = response.data;

      // 5-c. 決済方法によって処理を分岐
      if (orderData.paymentMethod === 'stripe') {
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
          throw new Error('決済シートの初期化に失敗しました。');
        }
        // 5-c-2. Stripeシートを表示
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') {
            throw new Error('Canceled'); // 👈 キャンセル時は特別なエラーを投げる
          } else {
            throw new Error(`決済に失敗しました: ${presentError.message}`);
          }
        }
        // 決済成功
        return { paymentType: 'stripe' };
      } else {
        // 現金払い
        return { paymentType: 'cash' };
      }
    },
    // 8. ★ (NEW) onSuccess: 成功時の処理
    onSuccess: data => {
      if (data.paymentType === 'stripe') {
        Alert.alert('購入完了', 'ありがとうございます。購入が完了しました。');
      } else {
        Alert.alert(
          '予約完了',
          '会場での受け取り・お支払いの準備ができました。',
        );
      }

      // ★ キャッシュを無効化 (在庫数を更新するため)
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // 一覧画面の在庫も更新

      navigation.goBack();
    },
    // 9. ★ (NEW) onError: 失敗時の処理
    onError: (err: any) => {
      // 5-d. (旧 handleCreateOrder の catch ブロック)
      if (err.message === 'Canceled') {
        Alert.alert('キャンセル', '決済がキャンセルされました。');
        return; // 'Canceled' はエラーとして表示しない
      }
      const message =
        err.response?.data?.message ||
        err.message ||
        '注文処理中にエラーが発生しました。';
      Alert.alert('注文エラー', message);
    },
    // (finally は isPending で管理)
  });

  // 4. ★ (NEW) RefreshControl が呼び出す "専用" の関数
  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true); // 👈 クルクル開始
    try {
      await refetch(); // 👈 useQuery の refetch を実行
    } catch (error) {
      // (エラーは useQuery の isError が検知するのでここでは不要)
    }
    setIsManualRefetching(false); // 👈 クルクル停止
  }, [refetch]);

  // 10. ★ (NEW) handleCreateOrder:
  // バリデーションを実行し、useMutation を "呼び出す" 関数
  const handleCreateOrder = async () => {
    if (!product || !user) return;

    // 5-a. ★ 住所バリデーション (変更なし)
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

    // 11. ★ (NEW) バリデーション通過後、mutation を実行
    // (旧 try...catch...finally は useMutation が担当)
    createOrderMutation.mutate({
      productId: product.id,
      quantity: quantity,
      paymentMethod: paymentMethod,
      deliveryMethod: deliveryMethod,
    });
  };

  // --- 6. ヘルパー変数 (JSX描画用) ---
  const isSoldOut = product ? product.stock <= 0 : false;
  const totalPrice = (product?.price || 0) * quantity;
  const isAddressComplete =
    user &&
    user.postal_code &&
    user.prefecture &&
    user.city &&
    user.address_line1;

  // 12. ★ isProcessing を mutation.isPending に置き換え
  const isPurchaseDisabled =
    isSoldOut ||
    createOrderMutation.isPending || // 👈 変更
    (deliveryMethod === 'mail' && !isAddressComplete);

  // --- 7. ローディング/エラー表示 ---
  // 13. ★ loading を isLoading に置き換え
  if (isLoading || !user) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  // 14. ★ (NEW) エラー表示
  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>商品の取得に失敗しました。</Text>
        <Button title="再試行" onPress={() => refetch()} color="#0A84FF" />
      </SafeAreaView>
    );
  }

  // --- 8. メイン描画 ---
  return (
    <SafeAreaView style={styles.container}>
      {/* 15. ★ RefreshControl を ScrollView に追加 */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching} // 👈 'isRefetching' ではなく 'isManualRefetching' を渡す
            onRefresh={onRefresh} // 👈 'refetch' ではなく 'onRefresh' (自作した関数) を渡す
            tintColor="#FFFFFF"
          />
        }
      >
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

        {/* --- オプションUI (変更なし) --- */}
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

        {/* 16. ★ 購入ボタン (isProcessing を isPending に変更) */}
        <View style={styles.buttonContainer}>
          {createOrderMutation.isPending ? ( // 👈 変更
            <ActivityIndicator size="large" color="#0A84FF" />
          ) : (
            <Button
              title={isSoldOut ? '売り切れ' : '注文を確定する'}
              onPress={handleCreateOrder}
              disabled={isPurchaseDisabled}
              color="#0A84FF"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイル (変更なし) ---
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
  infoContainer: { padding: 20, paddingBottom: 0 },
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
    paddingBottom: 40,
  },
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
    backgroundColor: '#0A84FF20',
  },
  optionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  optionButtonDisabledText: {
    color: '#555',
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    paddingHorizontal: 5,
    marginTop: -15,
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
    backgroundColor: '#FF3B3020',
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