import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Product, fetchMyFavorites } from '../../api/queries';
// コンポーネントのインポート
import FavoriteProductItem from './components/FavoriteProductItem';

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
    queryKey: ['myFavorites'],
    queryFn: fetchMyFavorites,
    staleTime: 1000 * 60 * 5,
  });

  // 2. いいね解除用 Mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: (productId: number) =>
      api.post(`/products/${productId}/favorite`),

    onMutate: async productId => {
      // 関連キャッシュのキャンセル
      await queryClient.cancelQueries({ queryKey: ['myFavorites'] });
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', productId] });

      // A. お気に入り一覧の楽観的更新
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

      // B. 商品一覧の楽観的更新
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

      // C. 詳細データの楽観的更新
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
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleToggleFavorite = (productId: number) => {
    toggleFavoriteMutation.mutate(productId);
  };

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
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products || []}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <FavoriteProductItem
            item={item}
            onPress={handleProductPress}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
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
  emptyText: { color: '#888', fontSize: 16 },
  retryButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  retryText: { color: '#FFF' },
});

export default FavoriteProductsScreen;
