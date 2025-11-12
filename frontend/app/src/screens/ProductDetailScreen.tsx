// C:\Nokku\frontend\app\src\screens\ProductDetailScreen.tsx (仮のパス)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProductStackParamList } from '../navigators/ProductStackNavigator'; // (後で修正)
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';


// --- 型定義 ---

// 1. APIから取得する商品の詳細な型 (ProductListScreen と同じものを想定)
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  // (アーティストIDなどもあれば)
  // artist_id: number;
}

// 2. ナビゲーションの型
type ProductDetailRouteProp = RouteProp<ProductStackParamList, 'ProductDetail'>;
type ProductDetailNavigationProp = StackNavigationProp<
  ProductStackParamList,
  'ProductDetail'
>;

// --- コンポーネント ---
const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<ProductDetailNavigationProp>();
  const { productId } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // 3. APIから商品詳細データを取得
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // /api/products/{id} を叩く (ProductController@show を想定)
        const response = await api.get<Product>(`/products/${productId}`);
        setProduct(response.data);
      } catch (error) {
        console.error('商品詳細の取得エラー:', error);
        Alert.alert('エラー', '商品情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]); // productId が変わった時だけ再取得

  // 4. 決済画面への遷移ハンドラ
  const handlePurchasePress = () => {
    if (!product) return;

    if (product.stock <= 0) {
      Alert.alert('売り切れ', 'この商品は現在在庫切れです。');
      return;
    }

    // 5. PaymentScreen に必要な情報を渡して遷移
    navigation.navigate('Payment', {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
      },
    });
  };

  // --- レンダリング ---
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>商品情報の取得に失敗しました。</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 商品画像 */}
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder]} />
        )}

        {/* 商品情報 */}
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>
            ¥{product.price.toLocaleString()}
          </Text>
          <Text style={styles.productStock}>在庫: {product.stock}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
        </View>

        {/* 購入ボタン */}
        <View style={styles.buttonContainer}>
          <Button
            title="購入する"
            onPress={handlePurchasePress}
            disabled={product.stock <= 0}
            color="#0A84FF"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイル ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  productImage: {
    width: '100%',
    height: 300, // 高さを固定
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: '#333',
  },
  infoContainer: {
    padding: 20,
  },
  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 22,
    color: '#4CAF50', // List と色を合わせる
    fontWeight: '600',
    marginBottom: 10,
  },
  productStock: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 20,
  },
  productDescription: {
    fontSize: 16,
    color: '#BBBBBB',
    lineHeight: 24,
  },
  buttonContainer: {
    padding: 20,
    marginTop: 20,
  },
});

export default ProductDetailScreen;
