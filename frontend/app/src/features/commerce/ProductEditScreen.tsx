import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import api from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Product } from '../api/queries';
// ★ 追加: 自作フック
import { useImageUpload } from '../hooks/useImageUpload';

type ProductEditScreenRouteProp = RouteProp<
  { params: { productId: number } },
  'params'
>;

const ProductEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ProductEditScreenRouteProp>();
  const { productId } = route.params;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [limitPerUser, setLimitPerUser] = useState('');

  // ★ 変更: useImageUpload フックを使用
  const {
    imageUri,
    uploadedPath,
    isUploading,
    selectImage,
    setImageFromUrl, // 既存画像のセット用
  } = useImageUpload('product');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 1. 初回読み込み
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await api.get<Product>(`/products/${productId}`);
        const product = response.data;

        setName(product.name);
        setDescription(product.description);
        setPrice(String(product.price));
        setStock(String(product.stock));
        setLimitPerUser(
          product.limit_per_user ? String(product.limit_per_user) : '',
        );

        // ★ 既存の画像URLをフックにセット (プレビュー用)
        // uploadedPath は null のままなので、変更がなければ送信されない
        setImageFromUrl(product.image_url);
      } catch (error) {
        Alert.alert('エラー', '商品情報の取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, navigation, setImageFromUrl]);

  // 7. 更新処理
  const handleUpdate = async () => {
    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    if (!name || !description || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    setUpdating(true);

    try {
      // ★ 変更: FormData ではなく JSON で送信
      // 画像パスは文字列で送れるため、通常の PUT リクエストが使える
      const payload: any = {
        name,
        description,
        price: priceNum,
        stock: stockNum,
        limit_per_user: limitPerUser ? parseInt(limitPerUser, 10) : null,
      };

      // ★ 画像が新しくアップロードされている場合のみ、image_url を送信
      // (uploadedPath が null なら、画像は変更しない＝キーを送らない)
      if (uploadedPath) {
        payload.image_url = uploadedPath;
      }

      await api.put(`/products/${productId}`, payload);

      Alert.alert('成功', 'グッズ情報を更新しました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('グッズ更新エラー:', error.response?.data || error.message);
      let message = 'グッズの更新に失敗しました。';
      if (error.response && error.response.data?.message) {
        message = error.response.data.message;
      }
      Alert.alert('エラー', message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.form}>
          <Text style={styles.label}>グッズ名</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tシャツ"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>グッズ説明</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="グッズの詳細..."
            placeholderTextColor="#888"
            multiline
          />

          <Text style={styles.label}>価格 (円)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>在庫数</Text>
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>お一人様購入制限 (任意)</Text>
          <TextInput
            style={styles.input}
            value={limitPerUser}
            onChangeText={setLimitPerUser}
            keyboardType="numeric"
            placeholder="例: 3 (未入力で無制限)"
            placeholderTextColor="#888"
          />

          {/* ★ 画像選択 UI (Createと同じ) */}
          <Text style={styles.label}>画像</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={selectImage}
            disabled={isUploading}
          >
            <Text style={styles.imagePickerButtonText}>
              {imageUri ? '画像を変更' : '画像を選択'}
            </Text>
          </TouchableOpacity>

          {isUploading && (
            <ActivityIndicator
              size="small"
              color="#0A84FF"
              style={{ marginBottom: 10 }}
            />
          )}

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={[styles.imagePreview, styles.imagePlaceholder]} />
          )}

          {updating ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button
                title="更新する"
                onPress={handleUpdate}
                disabled={isUploading}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  form: {
    padding: 20,
    margin: 15,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonSpacing: {
    marginTop: 20,
  },
  imagePickerButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: '#333',
  },
});

export default ProductEditScreen;
