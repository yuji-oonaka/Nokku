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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  launchImageLibrary,
  ImagePickerResponse,
  ImageLibraryOptions, // ★追加
} from 'react-native-image-picker';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { TimelineStackParamList } from '../../navigators/TimelineStackNavigator';

interface SelectedImage {
  uri: string;
  type: string;
  fileName: string;
}

// 日付フォーマッター (API用)
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

type PostEditScreenRouteProp = RouteProp<TimelineStackParamList, 'PostEdit'>;

const PostEditScreen = () => {
  const route = useRoute<PostEditScreenRouteProp>();
  const navigation = useNavigation();
  const { post } = route.params;

  // --- State ---
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [loading, setLoading] = useState(false);

  // 画像関連: 新しい画像(newImage)があればそれを優先、なければ既存URL(existing)を使う
  const [newImage, setNewImage] = useState<SelectedImage | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    post.image_url || null,
  );

  const [publishAt, setPublishAt] = useState<Date | null>(
    post.publish_at ? new Date(post.publish_at) : null,
  );
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    post.expires_at ? new Date(post.expires_at) : null,
  );

  const [showPublishPicker, setShowPublishPicker] = useState(false);
  const [showExpirePicker, setShowExpirePicker] = useState(false);

  // 画像選択処理 (最適化済み)
  const handleChoosePhoto = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8, // ★圧縮
      maxWidth: 1024, // ★リサイズ
      maxHeight: 1024,
      includeBase64: false,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('エラー', '画像の読み込みに失敗しました。');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (asset.uri && asset.type && asset.fileName) {
          setNewImage({
            uri: asset.uri,
            type: asset.type,
            fileName: asset.fileName,
          });
        }
      }
    });
  };

  // 画像削除処理 (追加機能)
  const handleRemoveImage = () => {
    Alert.alert('確認', '画像を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => {
          setNewImage(null);
          setExistingImageUrl(null); // 既存画像もクリア
        },
      },
    ]);
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

  const handleUpdate = async () => {
    if (title.trim().length === 0 || content.trim().length === 0) {
      Alert.alert('エラー', 'タイトルと投稿内容を入力してください。');
      return;
    }

    setLoading(true);
    // 画像ロジック: newImageがあればアップロード、なければ既存URL(nullなら削除扱い)
    let finalImageUrl: string | null = existingImageUrl;

    try {
      // 1. 新しい画像があればアップロード
      if (newImage) {
        const formData = new FormData();
        formData.append('type', 'post');
        formData.append('image', {
          uri: newImage.uri,
          type: newImage.type,
          name: newImage.fileName,
        });

        const uploadResponse = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImageUrl = uploadResponse.data.url;
      }

      // 2. 更新リクエスト (PUT)
      await api.put(`/posts/${post.id}`, {
        title: title,
        content: content,
        image_url: finalImageUrl, // nullならDB側でも削除される想定
        publish_at: formatApiDateTime(publishAt),
        expires_at: formatApiDateTime(expiresAt),
      });

      Alert.alert('成功', '投稿を更新しました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('投稿更新エラー:', error.response?.data || error.message);
      Alert.alert('エラー', '投稿の更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const previewUri = newImage?.uri || existingImageUrl;

  return (
    <SafeAreaView style={styles.container}>
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

            {/* 画像選択エリア */}
            <Text style={styles.label}>画像</Text>
            <View style={styles.imageSection}>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={handleChoosePhoto}
              >
                {previewUri ? (
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.previewImage}
                  />
                ) : (
                  <Text style={styles.imagePickerText}>
                    📷 画像を選択 / 変更
                  </Text>
                )}
              </TouchableOpacity>

              {/* 画像削除ボタン (画像があるときだけ表示) */}
              {previewUri && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Text style={styles.removeImageText}>画像を削除</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* オプション */}
            <Text style={styles.sectionHeader}>公開オプション</Text>

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

            {/* 更新ボタン */}
            <View style={styles.buttonContainer}>
              {loading ? (
                <ActivityIndicator size="large" color="#0A84FF" />
              ) : (
                <Button
                  title="更新する"
                  onPress={handleUpdate}
                  disabled={loading}
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
          // 編集時は過去の日付もあり得るので minimumDate は設定しない
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
    paddingBottom: 40,
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
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
    backgroundColor: '#333333',
    color: '#FFFFFF',
  },
  // 画像関連スタイル
  imageSection: {
    marginBottom: 10,
  },
  imagePicker: {
    height: 180,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
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
  removeImageButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    padding: 8,
  },
  removeImageText: {
    color: '#FF3B30', // 赤色
    fontSize: 14,
  },
  // 日付ピッカー関連
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

export default PostEditScreen;
