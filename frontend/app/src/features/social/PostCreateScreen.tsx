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
  Platform,
  KeyboardAvoidingView, // ★追加
} from 'react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native'; // ★追加
import {
  launchImageLibrary,
  ImagePickerResponse,
  ImageLibraryOptions, // ★型定義追加
} from 'react-native-image-picker';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

interface SelectedImage {
  uri: string;
  type: string;
  fileName: string;
}

// 日付フォーマッター (API用 YYYY-MM-DD HH:MM:SS)
const formatApiDateTime = (date: Date | null): string | null => {
  if (!date) return null;
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 日付フォーマッター (表示用)
const formatDisplayDateTime = (date: Date | null): string => {
  if (!date) return '設定しない';
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PostCreateScreen = () => {
  const navigation = useNavigation(); // ★ナビゲーションフック
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );

  const [publishAt, setPublishAt] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showPublishPicker, setShowPublishPicker] = useState(false);
  const [showExpirePicker, setShowExpirePicker] = useState(false);

  // 画像選択処理
  const handleChoosePhoto = () => {
    // ★★★ 画像圧縮設定 ★★★
    // これをしないと数MBの画像を送信することになり、アプリが激重になります
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8, // 画質を80%に落とす（見た目はほぼ変わらない）
      maxWidth: 1024, // 幅を最大1024pxにリサイズ
      maxHeight: 1024, // 高さも制限
      includeBase64: false,
      selectionLimit: 1, // 1枚だけ選択
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
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
    });
  };

  const onPublishChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPublishPicker(false);
      if (event.type !== 'set') return;
    } else {
      setShowPublishPicker(false);
    }

    if (selectedDate) {
      setPublishAt(selectedDate);
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

  const handleSubmit = async () => {
    if (title.trim().length === 0 || content.trim().length === 0) {
      Alert.alert('エラー', 'タイトルと投稿内容を入力してください。');
      return;
    }

    setLoading(true);
    let uploadedImageUrl: string | null = null;

    try {
      // 1. 画像アップロード
      if (selectedImage) {
        const formData = new FormData();
        formData.append('type', 'post');
        formData.append('image', {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName,
        });

        // ヘッダーは api インスタンス側で自動制御される場合が多いが、明示的に指定
        const uploadResponse = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedImageUrl = uploadResponse.data.url;
      }

      // 2. 投稿データ送信
      await api.post('/posts', {
        title: title,
        content: content,
        image_url: uploadedImageUrl,
        publish_at: formatApiDateTime(publishAt),
        expires_at: formatApiDateTime(expiresAt),
      });

      Alert.alert('成功', '投稿が完了しました。', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(), // ★成功したら前の画面に戻る
        },
      ]);
    } catch (error: any) {
      console.error('投稿エラー:', error.response?.data || error.message);
      Alert.alert(
        'エラー',
        '投稿に失敗しました。時間をおいて再試行してください。',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ★ KeyboardAvoidingView でラップして、入力中のキーボード被りを防ぐ */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            {/* タイトル */}
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="お知らせのタイトル"
              placeholderTextColor="#888"
            />

            {/* 内容 */}
            <Text style={styles.label}>投稿内容</Text>
            <TextInput
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="いまどうしてる？"
              placeholderTextColor="#888"
              multiline={true}
              numberOfLines={6}
            />

            {/* 画像選択 */}
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
                <Text style={styles.imagePickerText}>📷 画像を追加 (任意)</Text>
              )}
            </TouchableOpacity>

            {/* オプション */}
            <Text style={styles.sectionHeader}>公開オプション</Text>

            {/* 公開日時 */}
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

            {/* 終了日時 */}
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

            {/* 送信ボタン */}
            <View style={styles.buttonContainer}>
              {loading ? (
                <ActivityIndicator size="large" color="#0A84FF" />
              ) : (
                <Button
                  title="投稿する"
                  onPress={handleSubmit}
                  disabled={loading} // 連打防止
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DatePickers */}
      {showPublishPicker && (
        <DateTimePicker
          value={publishAt || new Date()}
          mode="datetime"
          display="default"
          onChange={onPublishChange}
          minimumDate={new Date()}
        />
      )}
      {showExpirePicker && (
        <DateTimePicker
          value={expiresAt || publishAt || new Date()}
          mode="datetime"
          display="default"
          onChange={onExpireChange}
          minimumDate={publishAt || new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 40, // 下部の余白確保
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
    marginBottom: 8,
    color: '#FFFFFF',
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top', // Androidで上寄せ
    minHeight: 120,
    marginBottom: 20,
    backgroundColor: '#333333',
    color: '#FFFFFF',
  },
  imagePicker: {
    height: 180,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginBottom: 10,
    overflow: 'hidden',
  },
  imagePickerText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerLabel: {
    fontSize: 15,
    color: '#DDD',
  },
  datePickerButton: {
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 140,
    alignItems: 'center',
  },
  datePickerValue: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 30,
  },
});

export default PostCreateScreen;
