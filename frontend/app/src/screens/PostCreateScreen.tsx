import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform, // 1. ★ Platform をインポート
} from 'react-native';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  launchImageLibrary,
  ImagePickerResponse,
} from 'react-native-image-picker';
// 2. ★ DateTimePicker をインポート
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

interface SelectedImage {
  uri: string;
  type: string;
  fileName: string;
}

// 3. ★ API送信用に日付を 'YYYY-MM-DD HH:MM:SS' 形式に変換するヘルパー
const formatApiDateTime = (date: Date | null): string | null => {
  if (!date) return null;

  // toISOString() はUTCなので、ローカル（JST）の各部分を取得
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // getMonth() は 0-indexed
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // Laravel の 'date' バリデーションが解釈できる形式
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 4. ★ 表示用に日付をフォーマットするヘルパー
const formatDisplayDateTime = (date: Date | null): string => {
  if (!date) return '設定しない';
  // '2025/11/14 14:30' のような形式
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PostCreateScreen = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );

  // 5. ★ 日時 State を追加
  const [publishAt, setPublishAt] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // 6. ★ ピッカーの表示 State を追加
  const [showPublishPicker, setShowPublishPicker] = useState(false);
  const [showExpirePicker, setShowExpirePicker] = useState(false);

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

  // 7. ★ (NEW) 日時ピッカーの onChange ハンドラ
  const onPublishChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android は 'set' と 'dismissed' の両方のイベントが飛ぶので 'set' だけを拾う
    if (Platform.OS === 'android') {
      setShowPublishPicker(false);
      if (event.type !== 'set') return;
    } else {
      setShowPublishPicker(false);
    }

    if (selectedDate) {
      setPublishAt(selectedDate);
      // もし公開日時より前に終了日時が設定されていたら、終了日時をリセット
      if (expiresAt && expiresAt < selectedDate) {
        setExpiresAt(null);
      }
    }
  };

  const onExpireChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowExpirePicker(false);
      if (event.type !== 'set') return;
    } else {
      setShowExpirePicker(false);
    }

    if (selectedDate) {
      // 公開日時より前には設定させない
      if (publishAt && selectedDate < publishAt) {
        Alert.alert(
          'エラー',
          '掲載終了日時は、公開日時より後に設定してください。',
        );
        setExpiresAt(null);
      } else {
        setExpiresAt(selectedDate);
      }
    }
  };

  // 8. ★ 投稿処理 (handleSubmit) を修正
  const handleSubmit = async () => {
    if (title.trim().length === 0 || content.trim().length === 0) {
      Alert.alert('エラー', 'タイトルと投稿内容を入力してください。');
      return;
    }

    setLoading(true);
    let uploadedImageUrl: string | null = null;

    try {
      // 9. ★ ステップ1: 画像アップロード (変更なし)
      if (selectedImage) {
        // [・・・(FormData, api.post('/upload-image') は変更なし)・・・]
        const formData = new FormData();
        formData.append('image', {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName,
        });
        const uploadResponse = await api.post('/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedImageUrl = uploadResponse.data.url;
      }

      // 10. ★ ステップ2: /api/posts に 'title' と「日付」を含めて投稿
      await api.post('/posts', {
        title: title,
        content: content,
        image_url: uploadedImageUrl,
        publish_at: formatApiDateTime(publishAt), // 👈 ★ 'publish_at' を追加
        expires_at: formatApiDateTime(expiresAt), // 👈 ★ 'expires_at' を追加
      });

      // 成功したら入力欄を空にする
      setTitle('');
      setContent('');
      setSelectedImage(null);
      setPublishAt(null); // 👈 ★ リセット
      setExpiresAt(null); // 👈 ★ リセット
      Alert.alert('成功', '投稿が完了しました。');
      // (TODO: 投稿後にタイムライン画面に自動遷移する)
    } catch (error: any) {
      // [・・・(エラーハンドリングは変更なし)・・・]
      console.error('投稿エラー:', error.response?.data || error.message);
      Alert.alert('エラー', '投稿に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.form}>
          {/* --- 必須項目 --- */}
          <Text style={styles.label}>タイトル</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="お知らせのタイトル"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>投稿内容</Text>
          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="いまどうしてる？"
            multiline={true}
            numberOfLines={6}
          />

          <TouchableOpacity
            style={styles.imagePicker}
            onPress={handleChoosePhoto}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
              />
            ) : (
              <Text style={styles.imagePickerText}>画像を選択</Text>
            )}
          </TouchableOpacity>

          {/* 11. ★★★ (NEW) オプションセクション ★★★ */}
          <Text style={styles.label}>オプション</Text>

          {/* 公開日時ピッカーボタン */}
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerLabel}>公開日時</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowPublishPicker(true)}
            >
              <Text style={styles.datePickerValue}>
                {formatDisplayDateTime(publishAt)}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.datePickerHelp}>
            ※未設定の場合は「即時公開」されます
          </Text>

          {/* 掲載終了日時ピッカーボタン */}
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerLabel}>掲載終了</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowExpirePicker(true)}
            >
              <Text style={styles.datePickerValue}>
                {formatDisplayDateTime(expiresAt)}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.datePickerHelp}>
            ※未設定の場合は「無期限」で掲載されます
          </Text>

          {/* 12. ★ 投稿ボタン */}
          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="投稿する" onPress={handleSubmit} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* 13. ★★★ (NEW) 日付ピッカー本体 (非表示) ★★★ */}
      {showPublishPicker && (
        <DateTimePicker
          value={publishAt || new Date()} // 1. 現在の時刻
          mode="datetime"
          display="default"
          onChange={onPublishChange}
          minimumDate={new Date()} // 2. 過去の日時は選択不可
          timeZoneName={'Asia/Tokyo'} // 3. JST
        />
      )}
      {showExpirePicker && (
        <DateTimePicker
          value={expiresAt || publishAt || new Date()} // 4. 終了日時は公開日時以降
          mode="datetime"
          display="default"
          onChange={onExpireChange}
          minimumDate={publishAt || new Date()} // 5. 公開日時より前は選択不可
          timeZoneName={'Asia/Tokyo'} // 6. JST
        />
      )}
    </SafeAreaView>
  );
};

// 14. ★ スタイルを追加
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
    marginTop: 10, // 👈 (NEW) ラベル間のマージン
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    marginBottom: 20,
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
    color: '#0A84FF',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    resizeMode: 'contain',
  },
  // --- ↓↓↓ (NEW) Date Picker Styles ↓↓↓ ---
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  datePickerButton: {
    backgroundColor: '#333333',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  datePickerValue: {
    color: '#0A84FF', // 選択された日付は青
    fontSize: 16,
  },
  datePickerHelp: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  // --- ↑↑↑ (NEW) Date Picker Styles ↑↑↑ ---
  buttonSpacing: {
    marginTop: 20,
  },
});

export default PostCreateScreen;
