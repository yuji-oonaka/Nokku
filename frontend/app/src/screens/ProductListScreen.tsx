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
// ↓↓↓ ProductStackNavigator のインポートパスはご自身の環境に合わせてください
import { ProductStackParamList } from '../navigation/ProductStackNavigator';
import api from '../services/api'; // 1. api.ts をインポート

// 型定義
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
}

// 2. Props (authToken) を削除
type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC = () => {
  // 3. Props を削除
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProductListNavigationProp>();

  // 4. fetchProducts を api.ts 使用に書き換え
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
  }, []); // 👈 authToken への依存も削除

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts]),
  );

  // グッズタップ時 (決済画面へ)
  const handleProductPress = (product: Product) => {
    navigation.navigate('Payment', {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
      },
    });
  };

  // 5. handleDeleteProduct を api.ts 使用に書き換え
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
            fetchProducts(); // リストを即時更新
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

  // 6. ★★★ 新規 ★★★
  // グッズ編集ハンドラ
  const handleEditProduct = (product: Product) => {
    navigation.navigate('ProductEdit', { productId: product.id });
  };
  // ★★★ ここまで ★★★

  // リストの各アイテム
  const renderItem = ({ item }: { item: Product }) => (
    // ここにあった問題の // コメントは削除されています
    <TouchableOpacity onPress={() => handleProductPress(item)}>
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

        {/* 7. ★★★ 編集ボタンを追加 ★★★ */}
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
        {/* ★★★ ここまで ★★★ */}
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

// --- スタイルシート ---
const styles = StyleSheet.create({
  // 8. ★★★ テーマカラーを他の画面と統一 ★★★
  container: { flex: 1, backgroundColor: '#000000', padding: 10 }, // #121212 -> #000000
  productItem: {
    backgroundColor: '#1C1C1E', // #222 -> #1C1C1E
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
    // 9. ★★★ 修正 (横並びにする) ★★★
    flexDirection: 'row', // 横並び
    paddingRight: 10,
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
