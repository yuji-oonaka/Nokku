import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
// ★ 追加: 自作フック
import { useImageUpload } from '../hooks/useImageUpload';

const ProductCreateScreen: React.FC = () => {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [limitPerUser, setLimitPerUser] = useState('');

  // ★ 変更: useImageUpload フックを使用
  // (selectImage を呼ぶと自動でアップロードされ、uploadedPath にパスが入る)
  const { imageUri, uploadedPath, isUploading, selectImage } =
    useImageUpload('product');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    if (!name || !description || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    setLoading(true);

    try {
      // ★ 変更: FormData ではなく JSON で送信
      // (画像は既にアップロード済みなので、パス文字列を送るだけ)
      const payload = {
        name,
        description,
        price: priceNum,
        stock: stockNum,
        limit_per_user: limitPerUser ? parseInt(limitPerUser, 10) : null,
        image_url: uploadedPath, // ★ 取得したパスを送る
      };

      await api.post('/products', payload);

      Alert.alert('成功', '新しいグッズを作成しました。');
      navigation.goBack();
    } catch (error: any) {
      console.error('グッズ作成エラー:', error.response?.data || error.message);
      let message = 'グッズの作成に失敗しました。';
      if (error.response && error.response.data?.message) {
        message = error.response.data.message;
      }
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

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

          {/* ★ 画像選択ボタン */}
          <Text style={styles.label}>画像 (任意)</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={selectImage}
            disabled={isUploading} // アップロード中は押せない
          >
            <Text style={styles.imagePickerButtonText}>
              {imageUri ? '画像を変更' : '画像を選択'}
            </Text>
          </TouchableOpacity>

          {/* ★ アップロード中のインジケータ */}
          {isUploading && (
            <ActivityIndicator
              size="small"
              color="#0A84FF"
              style={{ marginBottom: 10 }}
            />
          )}

          {/* ★ 画像プレビュー */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}

          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button
                title="グッズを作成"
                onPress={handleSubmit}
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
  form: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
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
});

export default ProductCreateScreen;
