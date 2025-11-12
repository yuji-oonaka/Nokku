import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../navigators/ProductStackNavigator';
import api from '../services/api';

// 1. ★ useAuth をインポート
import { useAuth } from '../context/AuthContext';

// (Product 型定義は変更なし)
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
}

type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC = () => {
  // 2. ★ useAuth() フックから user 情報を取得
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProductListNavigationProp>();

  // 3. ★ ユーザーが管理者/アーティストか判定
  // (user が null の場合も考慮)
  const isOwnerOrAdmin = !!(
    user &&
    (user.role === 'artist' || user.role === 'admin')
  );

  // (fetchProducts, handleProductPress, handleDeleteProduct, handleEditProduct は変更なし)
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error: any) {
      Alert.alert('エラー', 'グッズの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts]),
  );

  const handleProductPress = (product: Product) => {
    // 4. ★ アーティストは決済画面に遷移させない
    if (isOwnerOrAdmin) return;

    navigation.navigate('ProductDetail', {
      productId: product.id, // 👈 product オブジェクト丸ごとではなく、ID を渡す
    });
  };

  const handleDeleteProduct = async (product: Product) => {
    // (中身は変更なし)
    Alert.alert('グッズの削除', `「${product.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${product.id}`);
            Alert.alert('削除完了', `「${product.name}」を削除しました。`);
            fetchProducts();
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

  // リストの各アイテム
  const renderItem = ({ item }: { item: Product }) => (
    // 5. ★ アーティストは 'onPress' 無効 (TouchableOpacity 自体は残す)
    <TouchableOpacity
      onPress={() => handleProductPress(item)}
      disabled={isOwnerOrAdmin} // アーティストはタップ無効
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

        {/* 6. ★ ボタンの出し分け */}
        {isOwnerOrAdmin ? (
          // 管理者/アーティスト用のボタン
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
          // 一般ユーザー用のボタン (購入ボタンは親の TouchableOpacity が担当)
          // (ここでは何も表示しない、または「詳細」ボタンを置く)
          <View style={styles.adminButtonContainer} /> // 空のコンテナでレイアウトを維持
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : products.length === 0 ? (
        <Text style={styles.emptyText}>販売中のグッズはありません</Text>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
        />
      )}
    </SafeAreaView>
  );
};

// --- スタイルシート (変更なし) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 10 },
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
    minWidth: 120, // 7. ★ ボタンエリアの最小幅を確保
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default ProductListScreen;
