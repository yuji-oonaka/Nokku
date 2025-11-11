import React, { useState, useEffect } from 'react'; // 1. ★ useEffect をインポート
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity, // 2. ★ TouchableOpacity をインポート
  Platform, // 3. ★ Platform をインポート
} from 'react-native';
import api from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

// 4. ★ DateTimePicker をインポート
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

// (EventEditScreenRouteProp の型定義は変更なし)
type EventEditScreenRouteProp = RouteProp<
  { params: { eventId: number } },
  'params'
>;

// 5. ★ 日付フォーマット関数 (CreateScreen と共通)
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

  // フォームの状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');

  // 6. ★ 日付入力ロジック (CreateScreen と共通)
  const [date, setDate] = useState(new Date()); // 初期値
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const [loading, setLoading] = useState(true); // 読み込み中
  const [updating, setUpdating] = useState(false); // 更新中

  // 7. ★ 初回読み込み (useEffect) を修正
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        Alert.alert('エラー', 'イベントIDが指定されていません。');
        navigation.goBack();
        return;
      }
      try {
        setLoading(true);
        const response = await api.get(`/events/${eventId}`);
        const event = response.data;

        setTitle(event.title);
        setDescription(event.description);
        setVenue(event.venue);

        // 8. ★★★ 修正点 ★★★
        // APIから取得した日付文字列 (YYYY-MM-DD HH:MM:SS) を
        // Date オブジェクトに変換して State にセットする
        setDate(new Date(event.event_date));
        // (古い eventDate State は削除)
      } catch (error) {
        console.error('イベント取得エラー:', error);
        Alert.alert('エラー', 'イベント情報の取得に失敗しました。');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigation]);

  // 9. ★ ピッカーの処理 (CreateScreen と共通)
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

  // 10. ★ 更新処理 (handleUpdate) を修正
  const handleUpdate = async () => {
    if (!title || !description || !venue) {
      Alert.alert('エラー', 'すべての項目を入力してください。');
      return;
    }

    setUpdating(true);
    try {
      // 11. ★ Date オブジェクトを API 用の文字列にフォーマット
      const formattedEventDate = formatDateTimeForAPI(date);

      await api.put(`/events/${eventId}`, {
        title: title,
        description: description,
        venue: venue,
        event_date: formattedEventDate, // フォーマットした文字列を送信
      });

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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
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

          {/* 12. ★★★ 日付/時刻ピッカーのUI (CreateScreen と共通) ★★★ */}
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
          {/* ★★★ ここまで ★★★ */}

          {updating ? ( // 13. ★ loading -> updating に修正
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="更新する" onPress={handleUpdate} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 14. ★ スタイルを更新 (CreateScreen と共通化)
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
    margin: 15,
    backgroundColor: '#1C1C1E',
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
});

export default EventEditScreen;
