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
  TouchableOpacity, // 1. ★ TouchableOpacity をインポート
  Image, // 2. ★ Image をインポート
} from 'react-native';
// 3. ★ react-native-image-picker から必要なモジュールをインポート
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProductCreateScreen: React.FC = () => {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  // 4. ★ imageUrl (文字列) ではなく image (Assetオブジェクト) を保持
  const [image, setImage] = useState<Asset | null>(null);

  const [loading, setLoading] = useState(false);

  // 5. ★ 画像選択のロジック (PostCreateScreen と同様)
  const handleSelectImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7, // 画質を少し落としてファイルサイズを抑える
    });

    if (result.didCancel || result.errorCode) {
      console.log('画像選択がキャンセルまたは失敗しました。');
      return;
    }

    if (result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  // 6. ★ handleSubmit を FormData を使うように大幅修正
  const handleSubmit = async () => {
    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    if (!name || !description || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    setLoading(true);

    // 7. ★ FormData を作成
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price); // 文字列のままでOK (Laravel側で整数として扱われる)
    formData.append('stock', stock);

    // 8. ★ 画像が選択されていれば、FormData に追加
    if (image && image.uri && image.fileName && image.type) {
      formData.append('image', {
        uri: image.uri,
        name: image.fileName,
        type: image.type,
      });
    }

    try {
      // 9. ★ FormData を api.post で送信 (ヘッダー指定)
      await api.post('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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

          {/* 10. ★ 画像URL入力欄を削除し、画像選択UIに変更 */}
          <Text style={styles.label}>画像 (任意)</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={handleSelectImage}
          >
            <Text style={styles.imagePickerButtonText}>
              {image ? '画像を変更' : '画像を選択'}
            </Text>
          </TouchableOpacity>

          {/* 11. ★ 画像プレビュー */}
          {image && image.uri && (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          )}

          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="グッズを作成" onPress={handleSubmit} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 12. ★ スタイルを追加
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
  // --- ↓↓↓ ここから追加 ↓↓↓ ---
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
  // --- ↑↑↑ ここまで追加 ---
});

export default ProductCreateScreen;
