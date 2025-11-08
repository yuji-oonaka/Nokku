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
  Button, // 👈 1. Button をインポート
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../navigators/ProductStackNavigator';

const API_URL = 'http://10.0.2.2';

// 型定義
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
}
interface Props {
  authToken: string;
}
type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC<Props> = ({ authToken }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProductListNavigationProp>();

  // ↓↓↓ 2. fetchProducts関数を useCallback で「外」に定義 ↓↓↓
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('グッズの取得に失敗しました');
      }
      const data = (await response.json()) as Product[];
      setProducts(data);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts(); // フォーカス時に実行
    }, [fetchProducts]), // 依存配列
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

  // ↓↓↓ 4. グッズ削除処理メソッドを丸ごと追記 ↓↓↓
  const handleDeleteProduct = async (product: Product) => {
    Alert.alert('グッズの削除', `「${product.name}」を本当に削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(
              `${API_URL}/api/products/${product.id}`,
              {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authToken}`,
                },
              },
            );
            if (!response.ok) {
              if (response.status === 403) {
                throw new Error('このグッズを削除する権限がありません');
              }
              throw new Error('グッズの削除に失敗しました');
            }
            Alert.alert('削除完了', `「${product.name}」を削除しました。`);
            // ★重要★ リストを即時更新
            fetchProducts();
          } catch (error: any) {
            Alert.alert('エラー', error.message);
          }
        },
      },
    ]);
  };

  // リストの各アイテム
  const renderItem = ({ item }: { item: Product }) => (
    // 👈 5. 削除ボタンが押された時に詳細遷移しないようロジックを修正
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

        {/* ↓↓↓ 6. 削除ボタンを追記 ↓↓↓ */}
        <View style={styles.deleteButtonContainer}>
          <Button
            title="削除"
            color="#FF3B30"
            onPress={e => {
              e.stopPropagation(); // 👈 親のタップ(詳細遷移)を無効化
              handleDeleteProduct(item);
            }}
          />
        </View>
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
  container: { flex: 1, backgroundColor: '#121212', padding: 10 },
  productItem: {
    backgroundColor: '#222',
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center', // 👈 ボタンを中央揃え
  },
  productImage: { width: 100, height: 100, backgroundColor: '#333' },
  productInfo: {
    flex: 1,
    padding: 15,
    marginRight: 10, // 👈 ボタンとの余白
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
  deleteButtonContainer: {
    // 👈 削除ボタン用
    paddingRight: 15,
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default ProductListScreen;
