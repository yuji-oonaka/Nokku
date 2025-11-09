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
} from 'react-native';
import api from '../services/api';

const PostCreateScreen = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (content.trim().length === 0) {
      Alert.alert('エラー', '投稿内容を入力してください。');
      return;
    }

    setLoading(true);

    try {
      // APIを呼び出して投稿
      await api.post('/posts', {
        content: content,
        // TODO: 画像アップロード機能 (image_url)
      });

      // 成功したら入力欄を空にする
      setContent('');
      Alert.alert('成功', '投稿が完了しました。');
      // TODO: 投稿後にタイムライン画面に自動遷移する、などの処理
    } catch (error) {
      console.error('投稿エラー:', error);
      Alert.alert('エラー', '投稿に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>投稿内容</Text>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="いまどうしてる？"
          multiline={true} // 複数行の入力を許可
          numberOfLines={6} // 表示上の行数
        />

        {/* TODO: 画像アップロードボタン */}

        {loading ? (
          <ActivityIndicator size="large" style={styles.buttonSpacing} />
        ) : (
          <Button title="投稿する" onPress={handleSubmit} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  form: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 15,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    textAlignVertical: 'top', // Androidで上寄せ
    minHeight: 120, // 最小の高さ
    marginBottom: 20,
  },
  buttonSpacing: {
    marginTop: 10,
  },
});

export default PostCreateScreen;
