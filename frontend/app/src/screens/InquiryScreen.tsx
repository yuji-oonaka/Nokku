import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; // 1. ★ ユーザー情報を取得するため

const InquiryScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth(); // 2. ★ ログインユーザー情報を取得

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 3. ★ 送信ボタンの処理
  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('エラー', '件名と本文の両方を入力してください。');
      return;
    }

    setLoading(true);
    try {
      // 4. ★ /api/inquiries を呼び出す
      await api.post('/inquiries', {
        subject: subject,
        message: message,
      });

      Alert.alert(
        '送信完了',
        'お問い合わせが送信されました。運営からの返信をお待ちください。',
        [
          { text: 'OK', onPress: () => navigation.goBack() }, // 成功したらマイページに戻る
        ],
      );
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('お問い合わせ送信エラー:', error);
      Alert.alert(
        'エラー',
        '送信に失敗しました。時間をおいて再度お試しください。',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.form}>
          <Text style={styles.label}>あなたのEmail</Text>
          <TextInput
            style={[styles.input, styles.readOnly]}
            value={user?.email || '読み込み中...'} // 5. ★ AuthContext からEmailを表示
            editable={false}
          />

          <Text style={styles.label}>件名</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="例: 決済エラーについて"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>お問い合わせ内容</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={message}
            onChangeText={setMessage}
            placeholder="問題の詳細を具体的に入力してください..."
            placeholderTextColor="#888"
            multiline
          />

          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="送信する" onPress={handleSubmit} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 6. ★ スタイル (EventCreateScreen などと共通)
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
  readOnly: {
    backgroundColor: '#444', // 少し濃いグレー
    color: '#AAA',
  },
  textarea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  buttonSpacing: {
    marginTop: 20,
  },
});

export default InquiryScreen;
