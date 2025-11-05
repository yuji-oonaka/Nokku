import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  Image, // 商品画像用に Image を追加
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native'; // 👈 2. useNavigation をインポート
import {StackNavigationProp} from '@react-navigation/stack'; // 👈 3. 型定義をインポート
import {ProductStackParamList} from '../navigators/ProductStackNavigator'; // 👈 4. 作成したスタックの型をインポート

const API_URL = 'http://10.0.2.2';

// Productの型を定義
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null; // 画像は無いかもしれないので null許容
}

interface Props {
  authToken: string; // 認証済みトークン
}

type ProductListNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductList'
>;

const ProductListScreen: React.FC<Props> = ({ authToken }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProductListNavigationProp>();

  useFocusEffect(
    useCallback(() => {
      const fetchProducts = async () => {
        try {
          setLoading(true);
          const response = await fetch(`${API_URL}/api/products`, {
            // API /api/products
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
      };

      fetchProducts();
    }, [authToken]) // 依存配列は useCallback の方に書きます
  );

  const handleProductPress = (product: Product) => {
    // PaymentScreenに必要な情報だけを渡す
    navigation.navigate('Payment', {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
      },
    });
  };

  // リストの各アイテム
  const renderItem = ({ item }: { item: Product }) => (
    // 👈 8. アイテム全体を TouchableOpacity で囲む
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
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 10,
  },
  productItem: {
    backgroundColor: '#222',
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row', // 画像とテキストを横並びに
    overflow: 'hidden', // 角丸を効かせるため
  },
  productImage: {
    width: 100,
    height: 100,
    backgroundColor: '#333', // 画像読み込み中の背景
  },
  productInfo: {
    flex: 1,
    padding: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productDescription: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  productStock: {
    fontSize: 14,
    color: '#888888',
    marginTop: 5,
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default ProductListScreen;
