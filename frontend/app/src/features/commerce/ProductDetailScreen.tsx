import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Button,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ProductStackParamList } from '../../navigators/ProductStackNavigator';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, fetchProductById } from '../../api/queries';
import SoundService from '../../services/SoundService';
// ★追加: 作成したコンポーネントをインポート
import ProductAdminControls from './components/ProductAdminControls';

type ProductDetailRouteProp = RouteProp<ProductStackParamList, 'ProductDetail'>;

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { productId } = route.params;

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(1);
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // 1. 商品データ取得
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

  // --- ★追加: 権限チェックロジック ---
  const isOwner =
    user?.id !== undefined &&
    product?.artist?.id !== undefined &&
    String(product.artist.id) === String(user.id);

  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || isOwner;
  // -----------------------------------

  // 2. お気に入り切り替え
  const toggleFavoriteMutation = useMutation({
    mutationFn: () => api.post(`/products/${productId}/favorite`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['product', productId] });
      await queryClient.cancelQueries({ queryKey: ['products'] });

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
      return { previousProduct };
    },
    onError: (err, variables, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          ['product', productId],
          context.previousProduct,
        );
      }
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true);
    await refetch();
    setIsManualRefetching(false);
  }, [refetch]);

  // 3. 購入ボタン押下時の処理
  const handlePressBuy = () => {
    if (!product) return;
    SoundService.triggerHaptic('impactMedium');
    navigation.navigate('Payment', {
      product: product,
      quantity: quantity,
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

  const handleFavoritePress = () => {
    SoundService.triggerHaptic('impactLight');
    toggleFavoriteMutation.mutate();
  };

  // --- ★追加: 編集・削除ハンドラー ---
  const handleEdit = () => {
    navigation.navigate('ProductEdit', { productId });
  };

  const handleDelete = () => {
    Alert.alert(
      '削除確認',
      '本当にこのグッズを削除しますか？\nこの操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${productId}`);
              Alert.alert('削除完了', 'グッズを削除しました。');
              queryClient.invalidateQueries({ queryKey: ['products'] });
              navigation.goBack();
            } catch (error: any) {
              if (error.response?.status === 403) {
                Alert.alert('エラー', '削除権限がありません');
              } else {
                Alert.alert('エラー', '削除に失敗しました');
              }
            }
          },
        },
      ],
    );
  };
  // -----------------------------------

  const isSoldOut = product ? product.stock <= 0 : false;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (isError || !product) {
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
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* 商品画像 */}
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder]} />
        )}

        <View style={styles.infoContainer}>
          {product.artist && (
            <Text style={styles.organizerNameSimple} numberOfLines={1}>
              {product.artist.nickname}
            </Text>
          )}

          <View style={styles.headerRow}>
            <Text style={styles.productName}>{product.name}</Text>
            {user?.role !== 'artist' && (
              <TouchableOpacity
                style={styles.heartButton}
                onPress={handleFavoritePress}
              >
                <View style={styles.heartContainer}>
                  <Text style={styles.heartIcon}>
                    {product.is_liked ? '❤️' : '🤍'}
                  </Text>
                  <Text style={styles.likeCountText}>
                    {product.likes_count || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.productPrice}>
            ¥{product.price.toLocaleString()}
          </Text>

          <Text style={styles.productStock}>
            {isSoldOut ? '在庫切れ' : `在庫: ${product.stock}`}
            {product.limit_per_user &&
              ` (お一人様${product.limit_per_user}点まで)`}
          </Text>

          <Text style={styles.productDescription}>{product.description}</Text>
        </View>

        {/* --- ★修正: 購入UIの表示制御 --- */}
        {!isOwner && (
          <>
            {/* 数量選択エリア */}
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
                  disabled={quantity >= product.stock}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 購入ボタンエリア */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.buyButton, isSoldOut && styles.disabledButton]}
                onPress={handlePressBuy}
                disabled={isSoldOut}
              >
                <Text style={styles.buyButtonText}>
                  {isSoldOut ? 'SOLD OUT' : '購入手続きへ'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ▼▼▼ 追加: お問い合わせボタン (購入ボタンの下) ▼▼▼ */}
        <View style={styles.inquiryContainer}>
          <TouchableOpacity
            style={styles.inquiryButton}
            onPress={() => {
              // MyPageStackを経由して問い合わせ作成へ遷移
              navigation.navigate('MyPageStack', {
                screen: 'InquiryCreate',
                params: {
                  // ※本来は 'merch' などの種別を作るべきですが、
                  // 今回の設計では 'order' (グッズ関連) に寄せるか、
                  // または 'user' (主催者指名) として送るのが現実的です。
                  // ここでは「販売者への質問」として 'user' を使い、target_id に artist_id を入れます。

                  target_type: 'user', // ★販売者(ユーザー)宛にする
                  target_id: product.artist?.id,
                  target_name: `${product.artist?.nickname} (出品者)`,
                  default_subject: `グッズ「${product.name}」について`,

                  // 件名に商品名を入れてあげると親切です
                  // ただし InquiryCreate 側で受け取るロジックが必要になるため、
                  // シンプルに宛先指定だけに留めます。
                },
              });
            }}
          >
            <Text style={styles.inquiryButtonText}>📩 出品者に質問する</Text>
          </TouchableOpacity>
        </View>
        {/* ▲▲▲ 追加ここまで ▲▲▲ */}

        {/* --- ★修正: コンポーネント化した管理者メニュー --- */}
        <ProductAdminControls
          visible={canEdit}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FF3B30', fontSize: 16, marginBottom: 10 },
  productImage: { width: '100%', height: 300, resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: '#333' },
  infoContainer: { padding: 20 },
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
    fontSize: 24,
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
  heartIcon: { fontSize: 28 },
  likeCountText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: -2,
  },
  productPrice: {
    fontSize: 22,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productStock: { fontSize: 14, color: '#888', marginBottom: 20 },
  productDescription: { fontSize: 16, color: '#BBB', lineHeight: 24 },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
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
  buttonContainer: { padding: 20, paddingTop: 0, paddingBottom: 0 },
  buyButton: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: '#555' },
  buyButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  inquiryContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inquiryButton: {
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
  },
  inquiryButtonText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;
