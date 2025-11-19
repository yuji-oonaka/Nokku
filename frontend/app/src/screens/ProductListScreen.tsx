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
import { ProductStackParamList } from '../navigators/ProductStackNavigator';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Product, fetchProducts } from '../api/queries';
import SoundService from '../services/SoundService';

type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<ProductListNavigationProp>();
  const queryClient = useQueryClient();

  const isOwnerOrAdmin = !!(
    user &&
    (user.role === 'artist' || user.role === 'admin')
  );

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
      // キャンセル
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', productId] }); // ★ 追加

      // 1. 一覧データの更新 (既存)
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

      // 2. ★★★ 詳細データの更新 (ここを追加！) ★★★
      // (もし詳細ページを一度でも開いていてキャッシュがある場合のみ更新される)
      const previousProductDetail = queryClient.getQueryData<Product>([
        'product',
        productId,
      ]);
      if (previousProductDetail) {
        queryClient.setQueryData<Product>(['product', productId], old => {
          if (!old) return undefined;
          const wasLiked = old.is_liked;
          return {
            ...old,
            is_liked: !wasLiked,
            likes_count: wasLiked
              ? (old.likes_count || 0) - 1
              : (old.likes_count || 0) + 1,
          };
        });
      }

      return { previousProducts, previousProductDetail }; // コンテキストに両方保存
    },

    onError: (err, productId, context) => {
      // 失敗したら両方戻す
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      if (context?.previousProductDetail) {
        // ★ 追加
        queryClient.setQueryData(
          ['product', productId],
          context.previousProductDetail,
        );
      }
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    },

    onSettled: (data, error, productId) => {
      // ★★★ 両方無効化して、次回アクセス時に最新を取得するようにする ★★★
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
    },
  });

  const handleProductPress = (product: Product) => {
    if (isOwnerOrAdmin) return;
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
    // 2. ★ 振動フィードバックを追加 (プチッ)
    SoundService.triggerHaptic('impactLight');
    toggleFavoriteMutation.mutate(product.id);
  };

  const renderItem = ({ item }: { item: Product }) => {
    return (
      <TouchableOpacity
        onPress={() => handleProductPress(item)}
        disabled={isOwnerOrAdmin}
        activeOpacity={0.8}
      >
        <View style={styles.productItem}>
          {item.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={styles.productImage}
            />
          )}

          <View style={styles.productInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>

              {/* ★ ハートボタン + 数字 (縦並び) */}
              {!isOwnerOrAdmin && (
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

            <Text style={styles.productDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.productPrice}>
              ¥{item.price.toLocaleString()}
            </Text>
            <Text style={styles.productStock}>在庫: {item.stock}</Text>
          </View>

          {isOwnerOrAdmin && (
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
  },
  productImage: { width: 100, height: 100, backgroundColor: '#333' },
  productInfo: {
    flex: 1,
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // 上揃えにする
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  productDescription: { fontSize: 14, color: '#BBBBBB', marginTop: 5 },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  productStock: { fontSize: 14, color: '#888888', marginTop: 5 },
  adminButtonContainer: {
    flexDirection: 'row',
    paddingRight: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  heartButton: {
    padding: 0, // 余白は heartContainer で調整
  },
  // ★ (NEW) ハートと数字をまとめるコンテナ
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  heartIcon: {
    fontSize: 20,
  },
  // ★ (NEW) 数字のスタイル
  likeCountText: {
    color: '#888',
    fontSize: 11,
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
