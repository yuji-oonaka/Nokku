import React, { useState, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../navigators/ProductStackNavigator';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, fetchProductById } from '../api/queries';
import SoundService from '../services/SoundService';

type ProductDetailRouteProp = RouteProp<ProductStackParamList, 'ProductDetail'>;
type PaymentMethod = 'stripe' | 'cash';
type DeliveryMethod = 'mail' | 'venue';

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { productId } = route.params;

  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('mail');
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  const {
    data: product,
    isLoading,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId),
    enabled: !!productId,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => api.post(`/products/${productId}/favorite`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['product', productId] });
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['myFavorites'] });

      const previousProduct = queryClient.getQueryData<Product>([
        'product',
        productId,
      ]);
      if (previousProduct) {
        const wasLiked = previousProduct.is_liked;
        queryClient.setQueryData<Product>(['product', productId], {
          ...previousProduct,
          is_liked: !wasLiked,
          likes_count: wasLiked
            ? (previousProduct.likes_count || 0) - 1
            : (previousProduct.likes_count || 0) + 1,
        });
      }

      const previousProductsList = queryClient.getQueryData<Product[]>([
        'products',
      ]);
      if (previousProductsList) {
        queryClient.setQueryData<Product[]>(['products'], oldList => {
          return oldList?.map(p => {
            if (p.id === productId) {
              const wasLiked = p.is_liked;
              return {
                ...p,
                is_liked: !wasLiked,
                likes_count: wasLiked
                  ? (p.likes_count || 0) - 1
                  : (p.likes_count || 0) + 1,
              };
            }
            return p;
          });
        });
      }
      return { previousProduct, previousProductsList };
    },
    onError: (err, variables, context) => {
      if (context?.previousProduct)
        queryClient.setQueryData(
          ['product', productId],
          context.previousProduct,
        );
      if (context?.previousProductsList)
        queryClient.setQueryData(['products'], context.previousProductsList);
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      productId: number;
      quantity: number;
      paymentMethod: PaymentMethod;
      deliveryMethod: DeliveryMethod;
    }) => {
      const response = await api.post('/orders', {
        product_id: orderData.productId,
        quantity: orderData.quantity,
        payment_method: orderData.paymentMethod,
        delivery_method: orderData.deliveryMethod,
      });
      const { clientSecret } = response.data;

      if (orderData.paymentMethod === 'stripe') {
        if (!clientSecret) throw new Error('決済の準備に失敗しました');
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'NOKKU, Inc.',
          paymentIntentClientSecret: clientSecret,
        });
        if (initError) throw new Error('決済シートの初期化に失敗しました。');
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') throw new Error('Canceled');
          else throw new Error(`決済に失敗しました: ${presentError.message}`);
        }
        return { paymentType: 'stripe' };
      } else {
        return { paymentType: 'cash' };
      }
    },
    onSuccess: data => {
      SoundService.playSuccess();
      if (data.paymentType === 'stripe') {
        Alert.alert('購入完了', 'ありがとうございます。購入が完了しました。');
      } else {
        Alert.alert(
          '予約完了',
          '会場での受け取り・お支払いの準備ができました。',
        );
      }
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigation.goBack();
    },
    onError: (err: any) => {
      if (err.message === 'Canceled') return;
      SoundService.playError();
      const message =
        err.response?.data?.message ||
        err.message ||
        '注文処理中にエラーが発生しました。';
      Alert.alert('注文エラー', message);
    },
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
    } catch (error) {}
    setIsManualRefetching(false);
  }, [refetch]);

  const handleCreateOrder = async () => {
    if (!product || !user) return;

    if (
      deliveryMethod === 'mail' &&
      (!user.postal_code ||
        !user.prefecture ||
        !user.city ||
        !user.address_line1)
    ) {
      Alert.alert('住所がありません', 'プロフィールを登録してください', [
        { text: '閉じる' },
        {
          text: 'プロフィールへ',
          onPress: () =>
            navigation.navigate('MyPageStack', { screen: 'ProfileEdit' }),
        },
      ]);
      return;
    }

    SoundService.triggerHaptic('impactMedium');

    createOrderMutation.mutate({
      productId: product.id,
      quantity: quantity,
      paymentMethod: paymentMethod,
      deliveryMethod: deliveryMethod,
    });
  };

  const incrementQuantity = () => {
    if (!product) return;
    if (quantity >= product.stock) return;
    if (product.limit_per_user != null && quantity >= product.limit_per_user) {
      SoundService.triggerHaptic('notificationWarning');
      Alert.alert('制限', `お一人様 ${product.limit_per_user} 点までです。`);
      return;
    }
    SoundService.triggerHaptic('impactLight');
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      SoundService.triggerHaptic('impactLight');
      setQuantity(prev => prev - 1);
    }
  };

  const isSoldOut = product ? product.stock <= 0 : false;
  const totalPrice = (product?.price || 0) * quantity;
  const isAddressComplete =
    user &&
    user.postal_code &&
    user.prefecture &&
    user.city &&
    user.address_line1;
  const isPurchaseDisabled =
    isSoldOut ||
    createOrderMutation.isPending ||
    (deliveryMethod === 'mail' && !isAddressComplete);

  const handleFavoritePress = () => {
    SoundService.triggerHaptic('impactLight');
    toggleFavoriteMutation.mutate();
  };

  if (isLoading || !user) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>商品の取得に失敗しました。</Text>
        <Button title="再試行" onPress={() => refetch()} color="#0A84FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {product?.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder]} />
        )}

        <View style={styles.infoContainer}>
          {/* ★★★ 追加: アーティスト名 (シンプル表示) ★★★ */}
          {product?.artist && (
            <Text style={styles.organizerNameSimple} numberOfLines={1}>
              {product.artist.nickname}
            </Text>
          )}
          {/* ★★★★★★★★★★★★★★★★★★★★★★★★★★★ */}

          <View style={styles.headerRow}>
            <Text style={styles.productName}>{product?.name}</Text>
            {user.role !== 'artist' && user.role !== 'admin' && (
              <TouchableOpacity
                style={styles.heartButton}
                onPress={handleFavoritePress}
              >
                <View style={styles.heartContainer}>
                  <Text style={styles.heartIcon}>
                    {product?.is_liked ? '❤️' : '🤍'}
                  </Text>
                  <Text style={styles.likeCountText}>
                    {product?.likes_count || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.productPrice}>
            ¥{product?.price.toLocaleString()}
          </Text>
          <Text style={styles.productStock}>
            {isSoldOut ? '在庫切れ' : `在庫: ${product?.stock}`}
            {product?.limit_per_user &&
              ` (お一人様${product.limit_per_user}点まで)`}
          </Text>
          <Text style={styles.productDescription}>{product?.description}</Text>
        </View>

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
              disabled={
                product
                  ? quantity >= product.stock ||
                    (product.limit_per_user != null &&
                      quantity >= product.limit_per_user)
                  : false
              }
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isSoldOut && (
          <View style={styles.optionsSection}>
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

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>合計金額:</Text>
              <Text style={styles.totalPrice}>
                ¥{totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {createOrderMutation.isPending ? (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 10 },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: { color: '#FF3B30', fontSize: 16 },
  productImage: { width: '100%', height: 300, resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: '#333' },
  infoContainer: { padding: 20, paddingBottom: 0 },
  // ★ 主催者名のスタイル (シンプル)
  organizerNameSimple: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  heartButton: { padding: 5 },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  heartIcon: { fontSize: 32 },
  likeCountText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: -4,
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
  buttonContainer: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  optionsSection: { padding: 20, paddingTop: 10 },
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
  optionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  optionButtonDisabledText: { color: '#555' },
  infoText: {
    color: '#888',
    fontSize: 12,
    paddingHorizontal: 5,
    marginTop: -15,
    marginBottom: 20,
  },
  addressContainer: { marginBottom: 20 },
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
  addressText: { color: '#FFFFFF', fontSize: 16, lineHeight: 24 },
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
  warningButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalLabel: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  totalPrice: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold' },
});

export default ProductDetailScreen;
