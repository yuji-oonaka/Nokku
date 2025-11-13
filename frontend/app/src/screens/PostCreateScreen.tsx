import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image, // 1. ★ Image をインポート
  TouchableOpacity, // 2. ★ TouchableOpacity をインポート
} from 'react-native';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

// 3. ★ react-native-image-picker から launchImageLibrary をインポート
import {
  launchImageLibrary,
  ImagePickerResponse,
  Asset,
} from 'react-native-image-picker';

// 4. ★ 選択された画像（アセット）の型を定義
interface SelectedImage {
  uri: string;
  type: string;
  fileName: string;
}

const PostCreateScreen = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 5. ★ 選択された画像（のAsset）を保持する State
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );

  // 6. ★「画像を選択」ボタンの処理
  const handleChoosePhoto = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        includeBase64: false,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('ImagePicker Error: ', response.errorMessage);
          Alert.alert('エラー', '画像の読み込みに失敗しました。');
        } else if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.uri && asset.type && asset.fileName) {
            // 7. ★ 選択された画像を State に保存
            setSelectedImage({
              uri: asset.uri,
              type: asset.type,
              fileName: asset.fileName,
            });
          }
        }
      },
    );
  };

  // 8. ★ 投稿処理 (handleSubmit) を修正
  const handleSubmit = async () => {
    if (content.trim().length === 0) {
      Alert.alert('エラー', '投稿内容を入力してください。');
      return;
    }

    setLoading(true);
    let uploadedImageUrl: string | null = null; // アップロード後のURL

    try {
      // 9. ★ ステップ1: 画像が選択されているか？
      if (selectedImage) {
        // FormData を作成
        const formData = new FormData();
        formData.append('image', {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName,
        });

        // 10. ★ /api/upload-image エンドポイントに画像をアップロード
        const uploadResponse = await api.post('/upload-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data', // 必須
          },
        });

        uploadedImageUrl = uploadResponse.data.url; // 返されたURLを取得
      }

      // 11. ★ ステップ2: /api/posts に投稿
      await api.post('/posts', {
        content: content,
        image_url: uploadedImageUrl, // 取得したURL (または null) を送信
      });

      // 成功したら入力欄を空にする
      setContent('');
      setSelectedImage(null);
      Alert.alert('成功', '投稿が完了しました。');
      // TODO: 投稿後にタイムライン画面に自動遷移する
    } catch (error: any) {
      console.error('投稿エラー:', error);
      if (error.response) {
        console.error('API Error data:', error.response.data);
      }
      Alert.alert('エラー', '投稿に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>投稿内容</Text>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="いまどうしてる？"
          multiline={true}
          numberOfLines={6}
        />

        {/* 12. ★ 画像選択ボタンとプレビュー */}
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={handleChoosePhoto}
        >
          {selectedImage ? (
            // 画像が選択されたらプレビューを表示
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
            />
          ) : (
            // 選択前はテキストを表示
            <Text style={styles.imagePickerText}>画像を選択</Text>
          )}
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" style={styles.buttonSpacing} />
        ) : (
          <Button title="投稿する" onPress={handleSubmit} />
        )}
      </View>
    </SafeAreaView>
  );
};

// 13. ★ スタイルを追加
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // ダークモード背景
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
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
    backgroundColor: '#333333',
    color: '#FFFFFF',
  },
  buttonSpacing: {
    marginTop: 20, // 修正 (10 -> 20)
  },
  // --- ★ 画像ピッカー用のスタイル ---
  imagePicker: {
    height: 150,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333333',
    marginBottom: 20,
  },
  imagePickerText: {
    color: '#0A84FF', // 青文字
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    resizeMode: 'contain', // アスペクト比を維持
  },
});

export default PostCreateScreen;
