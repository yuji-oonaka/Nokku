import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  launchImageLibrary,
  ImagePickerResponse,
  Asset,
} from 'react-native-image-picker';
// 2. ★ DateTimePicker をインポート
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { TimelineStackParamList } from '../navigators/TimelineStackNavigator';

interface SelectedImage {
  uri: string;
  type: string;
  fileName: string;
}

// 3. ★ API送信用ヘルパー (CreateScreen と同じ)
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

// 4. ★ 表示用ヘルパー (CreateScreen と同じ)
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

  // --- フォーム State ---
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [loading, setLoading] = useState(false);
  const [newImage, setNewImage] = useState<SelectedImage | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    post.image_url || null,
  );

  // 5. ★ 日時 State を追加 (post の値で初期化)
  // (post.publish_at は文字列なので、Date オブジェクトに変換)
  const [publishAt, setPublishAt] = useState<Date | null>(
    post.publish_at ? new Date(post.publish_at) : null,
  );
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    post.expires_at ? new Date(post.expires_at) : null,
  );

  // 6. ★ ピッカーの表示 State を追加
  const [showPublishPicker, setShowPublishPicker] = useState(false);
  const [showExpirePicker, setShowExpirePicker] = useState(false);

  // 8. ★ 画像選択のロジック (newImage をセットする)
  const handleChoosePhoto = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 1 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('エラー', '画像の読み込みに失敗しました。');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.uri && asset.type && asset.fileName) {
            setNewImage({
              // 👈 newImage にセット
              uri: asset.uri,
              type: asset.type,
              fileName: asset.fileName,
            });
            // (オプション) 新しい画像が選ばれたら、既存のURLプレビューは不要
            // setExistingImageUrl(null);
          }
        }
      },
    );
  };

  // 7. ★ (NEW) 日時ピッカーの onChange ハンドラ (CreateScreen と同じ)
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

  // 8. ★ 更新処理 (handleUpdate) を修正
  const handleUpdate = async () => {
    if (title.trim().length === 0 || content.trim().length === 0) {
      Alert.alert('エラー', 'タイトルと投稿内容を入力してください。');
      return;
    }

    setLoading(true);
    let finalImageUrl: string | null = existingImageUrl;

    try {
      // 9. ★ ステップ1: 画像アップロード (変更なし)
      if (newImage) {
        const formData = new FormData();
        formData.append('image', {
          uri: newImage.uri,
          type: newImage.type,
          name: newImage.fileName,
        });

        const uploadResponse = await api.post('/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        finalImageUrl = uploadResponse.data.url;
      }

      // 10. ★ ステップ2: /api/posts/{id} (PUT) に「日付」も送信
      await api.put(`/posts/${post.id}`, {
        title: title,
        content: content,
        image_url: finalImageUrl,
        publish_at: formatApiDateTime(publishAt), // 👈 ★ 'publish_at' を追加
        expires_at: formatApiDateTime(expiresAt), // 👈 ★ 'expires_at' を追加
      });

      Alert.alert('成功', '投稿を更新しました。');
      navigation.goBack();
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
      <ScrollView>
        <View style={styles.form}>
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
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            ) : (
              <Text style={styles.imagePickerText}>画像を選択</Text>
            )}
          </TouchableOpacity>

          {/* 11. ★★★ (NEW) オプションセクション ★★★ */}
          <Text style={styles.label}>オプション</Text>

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

          {/* 12. ★ 更新ボタン */}
          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="更新する" onPress={handleUpdate} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* 13. ★★★ (NEW) 日付ピッカー本体 (非表示) ★★★ */}
      {showPublishPicker && (
        <DateTimePicker
          value={publishAt || new Date()}
          mode="datetime"
          display="default"
          onChange={onPublishChange}
          minimumDate={new Date()} // 👈 編集時は過去の日付も許容するべきかも？
          timeZoneName={'Asia/Tokyo'}
        />
      )}
      {showExpirePicker && (
        <DateTimePicker
          value={expiresAt || publishAt || new Date()}
          mode="datetime"
          display="default"
          onChange={onExpireChange}
          minimumDate={publishAt || new Date()}
          timeZoneName={'Asia/Tokyo'}
        />
      )}
    </SafeAreaView>
  );
};

// 14. ★ スタイル (CreateScreen と同じ)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
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
    marginTop: 10,
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
  imagePickerText: { color: '#0A84FF', fontSize: 16 },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    resizeMode: 'contain',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  datePickerLabel: { fontSize: 16, color: '#FFFFFF' },
  datePickerButton: {
    backgroundColor: '#333333',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  datePickerValue: { color: '#0A84FF', fontSize: 16 },
  datePickerHelp: { fontSize: 12, color: '#888', marginBottom: 20 },
  buttonSpacing: { marginTop: 20 },
});

export default PostEditScreen;
