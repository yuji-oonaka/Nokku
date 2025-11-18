import React from 'react'; // 1. ★ useState, useCallback は不要に
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
  RefreshControl, // 2. ★ RefreshControl をインポート
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native'; // 3. ★ useFocusEffect は不要に
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../navigators/ProductStackNavigator';
import api from '../services/api'; // (削除APIでまだ使う)

import { useAuth } from '../context/AuthContext';

// 4. ★ React Query をインポート
import { useQuery, useQueryClient } from '@tanstack/react-query';
// 5. ★ 新しい型と関数をインポート
import { Product, fetchProducts } from '../api/queries';

type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<ProductListNavigationProp>();

  // 6. ★ QueryClient を取得 (キャッシュ操作用)
  const queryClient = useQueryClient();

  const isOwnerOrAdmin = !!(
    user &&
    (user.role === 'artist' || user.role === 'admin')
  );

  // 7. ★★★ (NEW) useQuery フック ★★★
  const {
    data: products,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    // 8. ★ キャッシュキー
    queryKey: ['products'],
    // 9. ★ queries.ts の関数を呼び出す
    queryFn: fetchProducts,
    // (この画面は filter がないので queryKey は固定)
  });

  // 10. ★ useFocusEffect と fetchProducts (useCallback) は削除

  const handleProductPress = (product: Product) => {
    if (isOwnerOrAdmin) return;
    navigation.navigate('ProductDetail', {
      productId: product.id,
    });
  };

  // 11. ★ handleDeleteProduct を修正
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

            // 12. ★★★★ (IMPORTANT) ★★★★
            // 削除成功時、'products' のキャッシュを無効化する
            // -> React Query が自動でデータを再取得（refetch）します
            queryClient.invalidateQueries({ queryKey: ['products'] });
            // ★ (古い fetchProducts() 呼び出しは不要)
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
    // 編集画面から戻ってきた時も、useQuery が
    // 'refetchOnWindowFocus' (デフォルト) で自動で再取得してくれます
    navigation.navigate('ProductEdit', { productId: product.id });
  };

  // renderItem は変更なし
  const renderItem = ({ item }: { item: Product }) => {
    return (
    <TouchableOpacity
      onPress={() => handleProductPress(item)}
      disabled={isOwnerOrAdmin}
    >
      <View style={styles.productItem}>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDescription}>{item.description}</Text>
          <Text style={styles.productPrice}>
            ¥{item.price.toLocaleString()}
          </Text>
          <Text style={styles.productStock}>在庫: {item.stock}</Text>
        </View>

        {isOwnerOrAdmin ? (
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
        ) : (
          <View style={styles.adminButtonContainer} />
        )}
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 13. ★ ローディング判定を 'isLoading' に変更 */}
      {isLoading ? (
        // 14. ★ ActivityIndicator を中央に配置 (styles.center を追加)
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        // 15. ★ エラー表示
        <View style={styles.center}>
          <Text style={styles.emptyText}>グッズの取得に失敗しました。</Text>
        </View>
      ) : (products || []).length === 0 ? (
        // 16. ★ 空のメッセージ
        <View style={styles.center}>
          <Text style={styles.emptyText}>販売中のグッズはありません</Text>
        </View>
      ) : (
        <FlatList
          data={products || []} // 17. ★ data は {products || []}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          // 18. ★★★ (NEW) RefreshControl を追加 ★★★
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

// --- スタイルシート (変更なし) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 10 },
  // 19. ★ (NEW) 中央配置用のスタイル (EventListScreen からコピー)
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
  productName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
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
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default ProductListScreen;
