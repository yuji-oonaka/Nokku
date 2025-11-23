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
  ScrollView, // ★ 追加: ScrollViewをインポート
} from 'react-native';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useImageUpload } from '../hooks/useImageUpload';

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

const EventCreateScreen = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!title || !description || !venue) {
      Alert.alert('エラー', 'すべての項目を入力してください。');
      return;
    }

    setLoading(true);
    try {
      const formattedEventDate = formatDateTimeForAPI(date);

      await api.post('/events', {
        title: title,
        description: description,
        venue: venue,
        event_date: formattedEventDate,
        image_url: uploadedPath,
      });

      Alert.alert('成功', '新しいイベントを作成しました。');
      navigation.goBack();
    } catch (error) {
      console.error('イベント作成エラー:', error);
      Alert.alert('エラー', 'イベントの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ★ 追加: ScrollView で全体をラップし、コンテンツ下部に余白を追加 */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
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

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}

          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button
                title="イベントを作成"
                onPress={handleSubmit}
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

export default EventCreateScreen;
