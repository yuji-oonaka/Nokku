import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; // 1. ★ useAuth をインポート

const ProfileEditScreen = () => {
  // 2. ★ name -> realName, nickname に変更
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 3. ★ useAuth から user を取得 (useFocusEffect の API 呼び出しを置き換え)
  const { user, loading: authLoading } = useAuth();

  // 4. ★ 取得ロジックを useAuth に依存するように変更
  useFocusEffect(
    useCallback(() => {
      if (user) {
        setRealName(user.real_name || '');
        setNickname(user.nickname || '');
        setEmail(user.email || '');
        setLoading(false);
      } else if (!authLoading) {
        // user が null なのに authLoading が終わっている = エラー
        setLoading(false);
        Alert.alert('エラー', 'プロフィールの取得に失敗しました。');
      }
    }, [user, authLoading]), // user または authLoading が変わったら実行
  );

  // 5. ★ 更新ボタン押下時の処理
  const handleUpdate = async () => {
    if (realName.trim().length === 0 || nickname.trim().length === 0) {
      Alert.alert('エラー', '本名とニックネームを入力してください。');
      return;
    }

    setUpdating(true);
    try {
      // 6. ★ PUT /profile に 'real_name' と 'nickname' を送信
      const response = await api.put('/profile', {
        real_name: realName,
        nickname: nickname,
      });

      setRealName(response.data.real_name);
      setNickname(response.data.nickname);
      Alert.alert('成功', 'プロフィールを更新しました。');
      // (AuthContext も更新する必要があるが、それは App.tsx のリロードで対応)
    } catch (error: any) {
      // 7. ★ ニックネーム重複エラーのハンドリング
      if (error.response && error.response.status === 422) {
        Alert.alert('更新エラー', 'そのニックネームは既に使用されています。');
      } else {
        Alert.alert('エラー', '更新に失敗しました。');
      }
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
      <View style={styles.form}>
        <Text style={styles.label}>メールアドレス (変更不可)</Text>
        <TextInput
          style={[styles.input, styles.readOnly]}
          value={email}
          editable={false}
        />

        {/* 8. ★ フォームを 'real_name' と 'nickname' に変更 */}
        <Text style={styles.label}>本名 (非公開)</Text>
        <TextInput
          style={styles.input}
          value={realName}
          onChangeText={setRealName}
          placeholder="（チケット購入・決済用）"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>ニックネーム (公開)</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="（チャット・投稿用）"
          placeholderTextColor="#888"
        />

        {updating ? (
          <ActivityIndicator size="large" style={styles.buttonSpacing} />
        ) : (
          <Button title="更新する" onPress={handleUpdate} />
        )}
      </View>
    </SafeAreaView>
  );
};

// 9. ★ スタイルを更新
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 10,
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
    backgroundColor: '#444',
    color: '#AAA',
  },
  buttonSpacing: {
    marginTop: 20,
  },
});

export default ProfileEditScreen;
