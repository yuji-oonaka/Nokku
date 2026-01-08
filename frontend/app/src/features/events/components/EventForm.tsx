import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useImageUpload } from '../../../hooks/useImageUpload'; // パスは環境に合わせて調整

// フォームデータの型定義
export interface EventFormData {
  title: string;
  description: string;
  venue: string;
  event_date: Date;
  image_url: string | null;
}

interface Props {
  initialValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel: string;
  isLoading?: boolean;
}

const EventForm = ({
  initialValues,
  onSubmit,
  submitLabel,
  isLoading = false,
}: Props) => {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(
    initialValues?.description || '',
  );
  const [venue, setVenue] = useState(initialValues?.venue || '');
  // 日付文字列の場合はDateオブジェクトに変換、なければ現在時刻
  const [date, setDate] = useState(
    initialValues?.event_date ? new Date(initialValues.event_date) : new Date(),
  );

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // 画像アップロードフック (初期値がある場合は考慮が必要だが、今回はアップロード優先)
  const { imageUri, uploadedPath, isUploading, selectImage } =
    useImageUpload('event');

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

  const handlePressSubmit = () => {
    // 1. 必須チェック
    if (!title.trim() || !description.trim() || !venue.trim()) {
      Alert.alert('エラー', 'すべての項目を入力してください。');
      return;
    }

    // 2. 過去日付チェック (編集時は許容する場合もあるが、作成時は基本NG)
    if (date < new Date()) {
      Alert.alert(
        '確認',
        '過去の日時が設定されていますが、このまま作成しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'OK',
            onPress: () => submitData(),
          },
        ],
      );
      return;
    }

    submitData();
  };

  const submitData = () => {
    // 既存の画像がある場合(編集時)と、新規アップロードがある場合を考慮
    const finalImagePath = uploadedPath || initialValues?.image_url || '';

    onSubmit({
      title,
      description,
      venue,
      event_date: date,
      image_url: finalImagePath,
    });
  };

  // 表示用画像URIの決定
  const displayImageUri = imageUri || initialValues?.image_url;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
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
          <View style={styles.dateRow}>
            <TouchableOpacity
              onPress={() => showMode('date')}
              style={styles.datePickerButton}
            >
              <Text style={styles.datePickerText}>
                {date.toLocaleDateString('ja-JP')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => showMode('time')}
              style={styles.datePickerButton}
            >
              <Text style={styles.datePickerText}>
                {date.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
          )}

          <Text style={styles.label}>イベント画像 (任意)</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={selectImage}
            disabled={isUploading}
          >
            <Text style={styles.imagePickerButtonText}>
              {displayImageUri ? '画像を変更' : '画像を選択'}
            </Text>
          </TouchableOpacity>

          {isUploading && (
            <ActivityIndicator
              size="small"
              color="#0A84FF"
              style={{ marginBottom: 10 }}
            />
          )}

          {displayImageUri && (
            <Image
              source={{ uri: displayImageUri }}
              style={styles.imagePreview}
            />
          )}

          <View style={styles.buttonSpacing}>
            <Button
              title={isLoading ? '処理中...' : submitLabel}
              onPress={handlePressSubmit}
              disabled={isLoading || isUploading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  datePickerButton: {
    flex: 0.48,
    backgroundColor: '#333333',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
  },
  datePickerText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  buttonSpacing: {
    marginTop: 20,
  },
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
});

export default EventForm;
