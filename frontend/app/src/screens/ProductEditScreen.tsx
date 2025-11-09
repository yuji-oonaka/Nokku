import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import api from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

// React Navigation から渡されるパラメータの型
type ProductEditScreenRouteProp = RouteProp<
  { params: { productId: number } },
  'params'
>;

const ProductEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ProductEditScreenRouteProp>();
  const { productId } = route.params; // 遷移元から productId を受け取る

  // フォームの状態
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // 文字列として保持
  const [stock, setStock] = useState(''); // 文字列として保持
  const [imageUrl, setImageUrl] = useState(''); // string | null

  const [loading, setLoading] = useState(true); // 読み込み中
  const [updating, setUpdating] = useState(false); // 更新中

  // 1. 初回読み込み時に既存のグッズ情報を取得
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        Alert.alert('エラー', 'グッズIDが指定されていません。');
        navigation.goBack();
        return;
      }
      try {
        setLoading(true);
        // ★ show API (GET /api/products/{id}) を呼び出す
        const response = await api.get(`/products/${productId}`);
        const product = response.data;

        setName(product.name);
        setDescription(product.description);
        setPrice(String(product.price)); // 数値を文字列に変換
        setStock(String(product.stock)); // 数値を文字列に変換
        setImageUrl(product.image_url || '');
      } catch (error) {
        console.error('グッズ取得エラー:', error);
        Alert.alert('エラー', 'グッズ情報の取得に失敗しました。');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, navigation]);

  // 2. 更新ボタン押下時の処理
  const handleUpdate = async () => {
    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    // バリデーション
    if (!name || !description || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    setUpdating(true);
    try {
      // ★ update API (PUT /api/products/{id}) を呼び出す
      await api.put(`/products/${productId}`, {
        name: name,
        description: description,
        price: priceNum,
        stock: stockNum,
        image_url: imageUrl || null,
      });

      Alert.alert('成功', 'グッズ情報を更新しました。', [
        { text: 'OK', onPress: () => navigation.goBack() }, // 成功したら前の画面（一覧）に戻る
      ]);
    } catch (error) {
      console.error('グッズ更新エラー:', error);
      Alert.alert('エラー', 'グッズの更新に失敗しました。');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
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
          />

          <Text style={styles.label}>グッズ説明</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="グッズの詳細..."
            multiline
          />

          <Text style={styles.label}>価格 (円)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="3000"
            keyboardType="numeric"
          />

          <Text style={styles.label}>在庫数</Text>
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            placeholder="100"
            keyboardType="numeric"
          />

          <Text style={styles.label}>画像URL (任意)</Text>
          <TextInput
            style={styles.input}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
          />

          {updating ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <Button title="更新する" onPress={handleUpdate} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// スタイル (EventEditScreen と共通)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // ダークモード背景
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
    backgroundColor: '#1C1C1E', // ダークモード フォーム背景
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF', // 白文字
  },
  input: {
    borderWidth: 1,
    borderColor: '#333', // 暗いボーダー
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#333333', // 暗い入力欄
    color: '#FFFFFF', // 白文字
    marginBottom: 20,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonSpacing: {
    marginTop: 20,
  },
});

export default ProductEditScreen;
