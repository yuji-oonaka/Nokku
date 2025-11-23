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
  TouchableOpacity,
  Image, // ★ 追加
} from 'react-native';
import api from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Event } from '../api/queries';
// ★ 追加: 自作フック
import { useImageUpload } from '../hooks/useImageUpload';

type EventEditScreenRouteProp = RouteProp<
  { params: { eventId: number } },
  'params'
>;

const formatDateTimeForAPI = (date: Date): string => {
  const dateString = date.toISOString().split('T')[0];
  const timeString = date.toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${dateString} ${timeString}`;
};

const EventEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<EventEditScreenRouteProp>();
  const { eventId } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // ★ 追加: useImageUpload フック
  const {
    imageUri,
    uploadedPath,
    isUploading,
    selectImage,
    setImageFromUrl, // 既存画像のセット用
  } = useImageUpload('event');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 1. 初回読み込み
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        Alert.alert('エラー', 'イベントIDが指定されていません。');
        navigation.goBack();
        return;
      }
      try {
        setLoading(true);
        // 型を指定して取得
        const response = await api.get<Event>(`/events/${eventId}`);
        const event = response.data;

        setTitle(event.title);
        setDescription(event.description);
        setVenue(event.venue);
        setDate(new Date(event.event_date));

        // ★ 既存の画像URLをフックにセット (プレビュー用)
        setImageFromUrl(event.image_url);
      } catch (error) {
        console.error('イベント取得エラー:', error);
        Alert.alert('エラー', 'イベント情報の取得に失敗しました。');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigation, setImageFromUrl]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showMode = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setPickerMode(currentMode);
  };

  // 2. 更新処理
  const handleUpdate = async () => {
    if (!title || !description || !venue) {
      Alert.alert('エラー', 'すべての項目を入力してください。');
      return;
    }

    setUpdating(true);
    try {
      const formattedEventDate = formatDateTimeForAPI(date);

      // ★ 変更: JSON形式で送信
      const payload: any = {
        title,
        description,
        venue,
        event_date: formattedEventDate,
      };

      // ★ 新しい画像がアップロードされていればパスを追加
      if (uploadedPath) {
        payload.image_url = uploadedPath;
      }

      await api.put(`/events/${eventId}`, payload);

      Alert.alert('成功', 'イベント情報を更新しました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('イベント更新エラー:', error);
      Alert.alert('エラー', 'イベントの更新に失敗しました。');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.form}>
          <Text style={styles.label}>イベント名</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="NOKKU SPECIAL LIVE"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>イベント説明</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="イベントの詳細..."
            placeholderTextColor="#888"
            multiline
          />

          <Text style={styles.label}>会場</Text>
          <TextInput
            style={styles.input}
            value={venue}
            onChangeText={setVenue}
            placeholder="Zepp Fukuoka"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>開催日時</Text>
          <TouchableOpacity
            onPress={() => showMode('date')}
            style={styles.datePickerButton}
          >
            <Text style={styles.datePickerText}>
              日付を選択: {date.toLocaleDateString('ja-JP')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => showMode('time')}
            style={styles.datePickerButton}
          >
            <Text style={styles.datePickerText}>
              時刻を選択:{' '}
              {date.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode={pickerMode}
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
          )}

          {/* ★ 追加: 画像選択 UI */}
          <Text style={styles.label}>イベント画像 (任意)</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={selectImage}
            disabled={isUploading}
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
          {/* ★★★ */}

          {updating ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button
                title="更新する"
                onPress={handleUpdate}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  datePickerButton: {
    backgroundColor: '#333333',
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  datePickerText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  buttonSpacing: {
    marginTop: 20,
  },
  // ★ 追加スタイル
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
    backgroundColor: '#333',
  },
});

export default EventEditScreen;
