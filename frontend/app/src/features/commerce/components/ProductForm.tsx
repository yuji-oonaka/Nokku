import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { Product } from '../../../api/queries';

// フォームから親に渡すデータの型
export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  stock: number;
  limit_per_user: number | null;
  image_url?: string; // 画像が変更された場合のみパスが入る
};

type ProductFormProps = {
  initialValues?: Product; // 編集時の初期値
  onSubmit: (data: ProductFormData) => Promise<void>; // 送信時の処理
  submitLabel: string; // ボタンのラベル ("作成" or "更新")
  isLoading?: boolean; // 親側で処理中かどうか
};

const ProductForm: React.FC<ProductFormProps> = ({
  initialValues,
  onSubmit,
  submitLabel,
  isLoading = false,
}) => {
  // フォームの状態
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [limitPerUser, setLimitPerUser] = useState('');

  // 画像アップロードフック
  const { imageUri, uploadedPath, isUploading, selectImage, setImageFromUrl } =
    useImageUpload('product');

  // 初期値が渡されたらフォームにセット (編集モード用)
  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name);
      setDescription(initialValues.description || '');
      setPrice(String(initialValues.price));
      setStock(String(initialValues.stock));
      setLimitPerUser(
        initialValues.limit_per_user
          ? String(initialValues.limit_per_user)
          : '',
      );
      // 既存画像のプレビューセット
      setImageFromUrl(initialValues.image_url);
    }
  }, [initialValues, setImageFromUrl]);

  const handleSubmit = () => {
    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    // バリデーション
    if (!name || !description || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    // データ整形
    const data: ProductFormData = {
      name,
      description,
      price: priceNum,
      stock: stockNum,
      limit_per_user: limitPerUser ? parseInt(limitPerUser, 10) : null,
      // 画像パス: 新しくアップロードされていれば uploadedPath、そうでなければ undefined
      image_url: uploadedPath || undefined,
    };

    onSubmit(data);
  };

  const isProcessing = isLoading || isUploading;

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

        {/* 画像選択 UI */}
        <Text style={styles.label}>画像 (任意)</Text>
        <TouchableOpacity
          style={styles.imagePickerButton}
          onPress={selectImage}
          disabled={isProcessing}
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

        {/* 送信ボタン */}
        <View style={styles.buttonSpacing}>
          {isProcessing ? (
            <ActivityIndicator size="large" color="#0A84FF" />
          ) : (
            <Button
              title={submitLabel}
              onPress={handleSubmit}
              disabled={isProcessing}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
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
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  buttonSpacing: { marginTop: 20 },
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
  imagePlaceholder: { backgroundColor: '#333' },
});

export default ProductForm;
