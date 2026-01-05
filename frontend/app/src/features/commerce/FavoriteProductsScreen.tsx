import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, fetchMyFavorites } from '../api/queries';

const FavoriteProductsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  // 1. お気に入り一覧を取得
  const {
    data: products,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['myFavorites'], // ★ 専用のキー
    queryFn: fetchMyFavorites,
    staleTime: 1000 * 60 * 5,
  });

  // 2. いいね解除用 Mutation (ここでもトグル動作)
  const toggleFavoriteMutation = useMutation({
    mutationFn: (productId: number) =>
      api.post(`/products/${productId}/favorite`),

    onMutate: async productId => {
      // 関連するキャッシュをすべてキャンセル
      await queryClient.cancelQueries({ queryKey: ['myFavorites'] });
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', productId] });

      // A. お気に入り一覧 ('myFavorites') の更新
      // ※ここでリストから即座に消すか、ハートを白くするか選べますが、
      //   誤操作防止のため「ハートを白くする（リストには残す）」挙動にします。
      const previousFavorites = queryClient.getQueryData<Product[]>([
        'myFavorites',
      ]);
      if (previousFavorites) {
        queryClient.setQueryData<Product[]>(['myFavorites'], old => {
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

      // B. 商品一覧 ('products') の更新 (同期)
      const previousProducts = queryClient.getQueryData<Product[]>([
        'products',
      ]);
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(['products'], old => {
          return old?.map(p => {
            if (p.id === productId) {
              const wasLiked = p.is_liked; // ※注意: リスト側の値を基準にするのは危険だが簡易実装
              // 正しくは「APIの結果を待つ」か「myFavoritesの状態を信じる」ですが、
              // ここではトグルなので反転させます
              return {
                ...p,
                is_liked: !p.is_liked,
                likes_count: p.is_liked
                  ? (p.likes_count || 0) - 1
                  : (p.likes_count || 0) + 1,
              };
            }
            return p;
          });
        });
      }

      // C. 詳細データ ('product') の更新 (同期)
      const previousDetail = queryClient.getQueryData<Product>([
        'product',
        productId,
      ]);
      if (previousDetail) {
        queryClient.setQueryData<Product>(['product', productId], old => {
          if (!old) return undefined;
          return {
            ...old,
            is_liked: !old.is_liked,
            likes_count: old.is_liked
              ? (old.likes_count || 0) - 1
              : (old.likes_count || 0) + 1,
          };
        });
      }

      return { previousFavorites, previousProducts, previousDetail };
    },

    onError: (err, productId, context) => {
      if (context?.previousFavorites)
        queryClient.setQueryData(['myFavorites'], context.previousFavorites);
      if (context?.previousProducts)
        queryClient.setQueryData(['products'], context.previousProducts);
      if (context?.previousDetail)
        queryClient.setQueryData(
          ['product', productId],
          context.previousDetail,
        );
      Alert.alert('エラー', '更新に失敗しました');
    },

    onSettled: (data, error, productId) => {
      // すべて無効化して整合性を保つ
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });

  const handleProductPress = (product: Product) => {
    // 詳細画面へ（スタックが異なる場合は工夫が必要ですが、通常は navigate で行けます）
    // ※ ProductStack 内の画面ですが、MyPageStack からもアクセスできるようにする必要があります
    //   簡単なのは navigate('ProductDetail' ...) ですが、ネスト構造によっては
    //   navigation.navigate('ProductStack', { screen: 'ProductDetail', params: ... }) と書く必要があります
    //   一旦シンプルに記述します。
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      onPress={() => handleProductPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.productItem}>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        )}
        <View style={styles.productInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            {/* ハートボタン */}
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => toggleFavoriteMutation.mutate(item.id)}
            >
              <View style={styles.heartContainer}>
                <Text style={styles.heartIcon}>
                  {item.is_liked ? '❤️' : '🤍'}
                </Text>
                <Text style={styles.likeCountText}>{item.likes_count}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.productPrice}>
            ¥{item.price.toLocaleString()}
          </Text>
          <Text style={styles.productStock}>
            {item.stock > 0 ? `在庫: ${item.stock}` : '在庫切れ'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>お気に入りの取得に失敗しました。</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products || []}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              お気に入りのグッズはまだありません
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FFFFFF"
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 10 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  listContent: { paddingBottom: 20 },
  productItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
  },
  productImage: { width: 80, height: 80, backgroundColor: '#333' },
  productInfo: { flex: 1, padding: 10, justifyContent: 'center' },
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
  },
  productPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  productStock: { fontSize: 12, color: '#888', marginTop: 2 },
  heartButton: { padding: 0 },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  heartIcon: { fontSize: 18 },
  likeCountText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -2,
  },
  emptyText: { color: '#888', fontSize: 16 },
});

export default FavoriteProductsScreen;
