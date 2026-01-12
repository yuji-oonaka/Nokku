import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
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
// 作成したコンポーネントをインポート
import ProductListItem from '../commerce/components/ProductListItem';

type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<ProductListNavigationProp>();
  const queryClient = useQueryClient();

  // --- データ取得 ---
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

  // --- アクション: お気に入り ---
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

  // --- ハンドラー ---
  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', {
      productId: product.id,
    });
  };

  const handleEditProduct = (product: Product) => {
    navigation.navigate('ProductEdit', { productId: product.id });
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

  const handleFavoritePress = (product: Product) => {
    SoundService.triggerHaptic('impactLight');
    toggleFavoriteMutation.mutate(product.id);
  };

  // --- レンダリング ---
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
          keyExtractor={item => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
          // ここで切り出したコンポーネントを使用
          renderItem={({ item }) => (
            <ProductListItem
              item={item}
              currentUserId={user?.id} // 親から自分のIDを渡す
              userRole={user?.role} // 親から自分のロールを渡す
              onPress={handleProductPress}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onToggleFavorite={handleFavoritePress}
            />
          )}
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
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default ProductListScreen;
