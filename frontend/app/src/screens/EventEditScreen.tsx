import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import api from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

// React Navigation から渡されるパラメータの型
type EventEditScreenRouteProp = RouteProp<
  { params: { eventId: number } },
  'params'
>;

const EventEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<EventEditScreenRouteProp>();
  const { eventId } = route.params; // 遷移元から eventId を受け取る

  // フォームの状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState(''); // YYYY-MM-DD HH:MM:SS 形式

  const [loading, setLoading] = useState(true); // 読み込み中
  const [updating, setUpdating] = useState(false); // 更新中

  // 1. 初回読み込み時に既存のイベント情報を取得
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        Alert.alert('エラー', 'イベントIDが指定されていません。');
        navigation.goBack();
        return;
      }
      try {
        setLoading(true);
        // ★ show API (GET /api/events/{id}) を呼び出す
        const response = await api.get(`/events/${eventId}`);
        const event = response.data;

        setTitle(event.title);
        setDescription(event.description);
        setVenue(event.venue);
        // 日付形式を YYYY-MM-DD HH:MM:SS に整形 (DBの形式に合わせる)
        setEventDate(event.event_date.replace('T', ' ').substring(0, 19));
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

  // 2. 更新ボタン押下時の処理
  const handleUpdate = async () => {
    // バリデーション
    if (!title || !description || !venue || !eventDate) {
      Alert.alert('エラー', 'すべての項目を入力してください。');
      return;
    }
    // TODO: 日付形式のバリデーション (Y-m-d H:i:s)

    setUpdating(true);
    try {
      // ★ update API (PUT /api/events/{id}) を呼び出す
      await api.put(`/events/${eventId}`, {
        title: title,
        description: description,
        venue: venue,
        event_date: eventDate,
      });

      Alert.alert('成功', 'イベント情報を更新しました。', [
        { text: 'OK', onPress: () => navigation.goBack() }, // 成功したら前の画面（詳細）に戻る
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
          />

          <Text style={styles.label}>イベント説明</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="イベントの詳細..."
            multiline
          />

          <Text style={styles.label}>会場</Text>
          <TextInput
            style={styles.input}
            value={venue}
            onChangeText={setVenue}
            placeholder="Zepp Fukuoka"
          />

          <Text style={styles.label}>開催日時 (YYYY-MM-DD HH:MM:SS)</Text>
          <TextInput
            style={styles.input}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="2025-12-24 18:00:00"
          />

          {updating ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <Button title="更新する" onPress={handleUpdate} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// スタイル (EventCreateScreen や ProfileEditScreen と共通)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // ダークモード背景
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
    backgroundColor: '#1C1C1E', // ダークモード フォーム背景
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF', // 白文字
  },
  input: {
    borderWidth: 1,
    borderColor: '#333', // 暗いボーダー
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#333333', // 暗い入力欄
    color: '#FFFFFF', // 白文字
    marginBottom: 20,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonSpacing: {
    marginTop: 20,
  },
});

export default EventEditScreen;
