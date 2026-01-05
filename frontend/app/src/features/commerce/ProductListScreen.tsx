import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  Button,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../../navigators/ProductStackNavigator';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Product, fetchProducts } from '../../api/queries';
import SoundService from '../../services/SoundService';

type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<ProductListNavigationProp>();
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (productId: number) =>
      api.post(`/products/${productId}/favorite`),

    onMutate: async productId => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', productId] });

      const previousProducts = queryClient.getQueryData<Product[]>([
        'products',
      ]);
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(['products'], old => {
          return old?.map(p => {
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
      return { previousProducts };
    },

    onError: (err, productId, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    },

    onSettled: (data, error, productId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
    },
  });

  const handleProductPress = (product: Product) => {
    // ★ 修正: 誰でも詳細画面へ遷移できるようにする
    navigation.navigate('ProductDetail', {
      productId: product.id,
    });
  };

  const handleDeleteProduct = async (product: Product) => {
    Alert.alert('グッズの削除', `「${product.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${product.id}`);
            Alert.alert('削除完了', `「${product.name}」を削除しました。`);
            queryClient.invalidateQueries({ queryKey: ['products'] });
          } catch (error: any) {
            if (error.response && error.response.status === 403) {
              Alert.alert('エラー', 'このグッズを削除する権限がありません');
            } else {
              Alert.alert('エラー', 'グッズの削除に失敗しました');
            }
          }
        },
      },
    ]);
  };

  const handleEditProduct = (product: Product) => {
    navigation.navigate('ProductEdit', { productId: product.id });
  };

  const handleFavoritePress = (product: Product) => {
    SoundService.triggerHaptic('impactLight');
    toggleFavoriteMutation.mutate(product.id);
  };

  const renderItem = ({ item }: { item: Product }) => {
    // ★★★ 修正: 権限チェックを厳密にする ★★★
    // 管理者かどうか
    const isAdmin = user?.role === 'admin';
    // 自分が作成したグッズかどうか (item.artist.id と自分の id が一致するか)
    const isMyProduct = user?.role === 'artist' && item.artist?.id === user.id;

    // 編集・削除ボタンを表示するか
    const canEdit = isAdmin || isMyProduct;

    return (
      <TouchableOpacity
        onPress={() => handleProductPress(item)}
        // ★ 修正: 常にタップ可能にする (詳細画面へ飛べるように)
        disabled={false}
        activeOpacity={0.8}
      >
        <View style={styles.productItem}>
          {/* 左側：画像 */}
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.productImage}
            />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]} />
          )}

          {/* 右側：情報エリア */}
          <View style={styles.productInfo}>
            {item.artist && (
              <Text style={styles.organizerNameSimple} numberOfLines={1}>
                {item.artist.nickname} presents
              </Text>
            )}

            <View style={styles.headerRow}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>

              {/* いいねボタン: 自分の商品でなければ表示 */}
              {!isMyProduct && (
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => handleFavoritePress(item)}
                >
                  <View style={styles.heartContainer}>
                    <Text style={styles.heartIcon}>
                      {item.is_liked ? '❤️' : '🤍'}
                    </Text>
                    <Text style={styles.likeCountText}>
                      {item.likes_count || 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* 価格と在庫 */}
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>
                ¥{item.price.toLocaleString()}
              </Text>
              <Text style={styles.productStock}>/ 在庫: {item.stock}</Text>
            </View>
          </View>

          {/* ★★★ 修正: 権限がある場合のみ編集・削除ボタンを表示 ★★★ */}
          {canEdit && (
            <View style={styles.adminButtonContainer}>
              <Button
                title="編集"
                color="#0A84FF"
                onPress={e => {
                  e.stopPropagation();
                  handleEditProduct(item);
                }}
              />
              <View style={{ marginLeft: 5 }}>
                <Button
                  title="削除"
                  color="#FF3B30"
                  onPress={e => {
                    e.stopPropagation();
                    handleDeleteProduct(item);
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>グッズの取得に失敗しました。</Text>
        </View>
      ) : (products || []).length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>販売中のグッズはありません</Text>
        </View>
      ) : (
        <FlatList
          data={products || []}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 10 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    height: 120,
  },
  productImage: {
    width: 100,
    height: '100%',
    backgroundColor: '#333',
    resizeMode: 'cover',
  },
  imagePlaceholder: { width: 100, height: '100%', backgroundColor: '#333' },

  productInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },

  organizerNameSimple: {
    color: '#FF9F0A',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
    marginBottom: 4,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  productStock: {
    fontSize: 12,
    color: '#888888',
  },

  adminButtonContainer: {
    flexDirection: 'row',
    paddingRight: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  heartButton: {
    padding: 0,
  },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  heartIcon: {
    fontSize: 18,
  },
  likeCountText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -2,
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default ProductListScreen;
