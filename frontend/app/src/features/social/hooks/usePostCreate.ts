import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  launchImageLibrary,
  ImagePickerResponse,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import api from '../../../services/api';

// 型定義
export interface SelectedImage {
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

export const usePostCreate = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

  const [publishAt, setPublishAt] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  // Picker表示管理
  const [showPublishPicker, setShowPublishPicker] = useState(false);
  const [showExpirePicker, setShowExpirePicker] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time'>('date');

  // 画像選択処理
  const handleChoosePhoto = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: false,
      selectionLimit: 1,
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

  // 公開日時処理
  const showPublishDatePicker = () => {
    if (Platform.OS === 'android') {
      setAndroidPickerMode('date');
    }
    setShowPublishPicker(true);
  };

  const onPublishChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowPublishPicker(false);
      return;
    }

    if (selectedDate) {
      if (Platform.OS === 'android') {
        setShowPublishPicker(false);
        if (androidPickerMode === 'date') {
          const newDate = new Date(selectedDate);
          const current = publishAt || new Date();
          newDate.setHours(current.getHours());
          newDate.setMinutes(current.getMinutes());
          setPublishAt(newDate);
          setTimeout(() => {
            setAndroidPickerMode('time');
            setShowPublishPicker(true);
          }, 100);
        } else {
          const newDate = new Date(publishAt || new Date());
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          setPublishAt(newDate);
          if (expiresAt && expiresAt < newDate) {
            setExpiresAt(null);
          }
        }
      } else {
        setShowPublishPicker(false);
        setPublishAt(selectedDate);
        if (expiresAt && expiresAt < selectedDate) {
          setExpiresAt(null);
        }
      }
    } else {
      setShowPublishPicker(false);
    }
  };

  // 終了日時処理
  const showExpireDatePicker = () => {
    if (Platform.OS === 'android') {
      setAndroidPickerMode('date');
    }
    setShowExpirePicker(true);
  };

  const onExpireChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowExpirePicker(false);
      return;
    }

    if (selectedDate) {
      if (Platform.OS === 'android') {
        setShowExpirePicker(false);
        if (androidPickerMode === 'date') {
          const newDate = new Date(selectedDate);
          const current = expiresAt || new Date();
          newDate.setHours(current.getHours());
          newDate.setMinutes(current.getMinutes());
          setExpiresAt(newDate);
          setTimeout(() => {
            setAndroidPickerMode('time');
            setShowExpirePicker(true);
          }, 100);
        } else {
          const newDate = new Date(expiresAt || new Date());
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          if (publishAt && newDate < publishAt) {
            Alert.alert('エラー', '掲載終了日時は、公開日時より後に設定してください。');
            setExpiresAt(null);
          } else {
            setExpiresAt(newDate);
          }
        }
      } else {
        setShowExpirePicker(false);
        if (publishAt && selectedDate < publishAt) {
          Alert.alert('エラー', '掲載終了日時は、公開日時より後に設定してください。');
          setExpiresAt(null);
        } else {
          setExpiresAt(selectedDate);
        }
      }
    } else {
      setShowExpirePicker(false);
    }
  };

  // 送信処理
  const handleSubmit = async () => {
    if (title.trim().length === 0 || content.trim().length === 0) {
      Alert.alert('エラー', 'タイトルと投稿内容を入力してください。');
      return;
    }

    setLoading(true);
    let uploadedImageUrl: string | null = null;

    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('type', 'post');
        formData.append('image', {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName,
        });

        const uploadResponse = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedImageUrl = uploadResponse.data.url;
      }

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
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('投稿エラー:', error.response?.data || error.message);
      Alert.alert('エラー', '投稿に失敗しました。時間をおいて再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  return {
    title, setTitle,
    content, setContent,
    loading,
    selectedImage,
    publishAt,
    expiresAt,
    showPublishPicker,
    showExpirePicker,
    androidPickerMode,
    handleChoosePhoto,
    showPublishDatePicker,
    onPublishChange,
    showExpireDatePicker,
    onExpireChange,
    handleSubmit,
  };
};