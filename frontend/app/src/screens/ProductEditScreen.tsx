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
  TouchableOpacity, // 1. ★ インポート
  Image, // 2. ★ インポート
} from 'react-native';
// 3. ★ react-native-image-picker をインポート
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import api from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProductEditScreenRouteProp = RouteProp<
  { params: { productId: number } },
  'params'
>;

const ProductEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ProductEditScreenRouteProp>();
  const { productId } = route.params;

  // フォームの状態
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  // 4. ★ 画像の State を2つに分離
  // (a) APIから読み込んだ既存の画像URL
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  // (b) ユーザーが新しく選択した画像ファイル
  const [newImage, setNewImage] = useState<Asset | null>(null);

  const [loading, setLoading] = useState(true); // 読み込み中
  const [updating, setUpdating] = useState(false); // 更新中

  // 1. 初回読み込み (ほぼ変更なし)
  useEffect(() => {
    const fetchProduct = async () => {
      // [・・・(productId がない場合のアラートは省略)・・・]
      try {
        setLoading(true);
        const response = await api.get(`/products/${productId}`);
        const product = response.data;

        setName(product.name);
        setDescription(product.description);
        setPrice(String(product.price));
        setStock(String(product.stock));

        // 5. ★ 既存の画像URLを 'existingImageUrl' state に保存
        setExistingImageUrl(product.image_url);
      } catch (error) {
        // [・・・(エラーアラートは省略)・・・]
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, navigation]);

  // 6. ★ 画像選択のロジック (Create と同じ)
  const handleSelectImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7,
    });
    if (result.didCancel || result.errorCode) return;
    if (result.assets && result.assets.length > 0) {
      setNewImage(result.assets[0]); // 👈 'newImage' state を更新
    }
  };

  // 7. ★ 更新処理 (handleUpdate) を FormData 方式に大改造
  const handleUpdate = async () => {
    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    if (!name || !description || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    setUpdating(true);

    // 8. ★ FormData を作成
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('stock', stock);

    // 9. ★【重要】Laravelに 'PUT' として扱わせるための "おまじない"
    formData.append('_method', 'PUT');

    // 10. ★ 新しい画像 (newImage) が選択されている場合のみ、FormData に追加
    if (newImage && newImage.uri && newImage.fileName && newImage.type) {
      formData.append('image', {
        uri: newImage.uri,
        name: newImage.fileName,
        type: newImage.type,
      });
    }

    try {
      // 11. ★ 'api.put' ではなく 'api.post' を使う (Laravelの仕様のため)
      await api.post(`/products/${productId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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

  // 12. ★ プレビュー用のURLを決定
  // 新しい画像 (newImage) があればそれ、なければ既存の画像 (existingImageUrl) を使う
  const previewUri = newImage?.uri || existingImageUrl;

  if (loading) {
    // [・・・(ローディング表示は省略)・・・]
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.form}>
          {/* --- Name, Description, Price, Stock の TextInput (変更なし) --- */}
          <Text style={styles.label}>グッズ名</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>グッズ説明</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>価格 (円)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          <Text style={styles.label}>在庫数</Text>
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
          />

          {/* 13. ★ 画像URL入力欄を削除し、画像選択UIに変更 */}
          <Text style={styles.label}>画像</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={handleSelectImage}
          >
            <Text style={styles.imagePickerButtonText}>画像を変更</Text>
          </TouchableOpacity>

          {/* 14. ★ 画像プレビュー (previewUri を使用) */}
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.imagePreview} />
          ) : (
            <View style={[styles.imagePreview, styles.imagePlaceholder]} />
          )}

          {updating ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="更新する" onPress={handleUpdate} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 15. ★ スタイルに画像関連のものを追加
const styles = StyleSheet.create({
  // [・・・(container, center, form, label, input, textarea は省略)・・・]
  container: { flex: 1, backgroundColor: '#000000' },
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
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  buttonSpacing: {
    marginTop: 20,
  },
  // --- ↓↓↓ ここから追加 (Create と同じ) ↓↓↓ ---
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
    backgroundColor: '#333', // 画像がない場合のプレースホルダ
  },
});

export default ProductEditScreen;
