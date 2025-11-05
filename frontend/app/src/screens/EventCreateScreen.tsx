import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView, // フォームが長くなるため ScrollView を使用
  ActivityIndicator,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'http://10.0.2.2';

interface Props {
  authToken: string;
  // イベント作成成功時に、イベントリストを再読み込みさせるためのコールバック
}

const EventCreateScreen: React.FC<Props> = ({ authToken}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState(''); // YYYY-MM-DD HH:MM:SS 形式
  const [price, setPrice] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // フロント側での簡易バリデーション
    if (
      !title ||
      !description ||
      !venue ||
      !eventDate ||
      !price ||
      !totalTickets
    ) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: title,
          description: description,
          venue: venue,
          event_date: eventDate, // '2025-12-24 18:00:00'
          price: parseInt(price, 10), // 文字列を数値に変換
          total_tickets: parseInt(totalTickets, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // バックエンドからのバリデーションエラーや権限エラー
        let errorMsg = data.message || 'イベントの作成に失敗しました';
        if (response.status === 403) {
          errorMsg = '権限エラー: アーティストまたは管理者のみ作成可能です。';
        } else if (response.status === 422) {
          // バリデーションエラー
          errorMsg =
            '入力内容が正しくありません。\n' +
            Object.values(data.errors).join('\n');
        }
        throw new Error(errorMsg);
      }

      // 成功
      Alert.alert('成功', '新しいイベントが作成されました！');
      // フォームをクリア
      setTitle('');
      setDescription('');
      setVenue('');
      setEventDate('');
      setPrice('');
      setTotalTickets('');
      //「Events」タブに自動で画面遷移する
      navigation.navigate('Events');
    } catch (error: any) {
      Alert.alert('作成エラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.label}>イベント名</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="例: NOKKU SPECIAL LIVE"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>開催場所</Text>
        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="例: Zepp Fukuoka"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>開催日時</Text>
        <TextInput
          style={styles.input}
          value={eventDate}
          onChangeText={setEventDate}
          placeholder="例: 2025-12-24 18:00:00"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>チケット価格 (円)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="例: 5000"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />

        <Text style={styles.label}>チケット総数</Text>
        <TextInput
          style={styles.input}
          value={totalTickets}
          onChangeText={setTotalTickets}
          placeholder="例: 1000"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />

        <Text style={styles.label}>イベント詳細</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="イベントの詳細説明..."
          placeholderTextColor="#888"
          multiline
        />

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <Button title="イベントを作成" onPress={handleSubmit} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイルシート ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    height: 50,
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    backgroundColor: '#333',
    fontSize: 16,
    marginBottom: 15,
  },
  textarea: {
    height: 120, // 複数行入力のため高さを広げる
    textAlignVertical: 'top', // Android用
    paddingTop: 15, // iOS/Android共通
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default EventCreateScreen;
