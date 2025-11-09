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

const ProfileEditScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // メールアドレスは表示のみ
  const [loading, setLoading] = useState(true); // 読み込み中
  const [updating, setUpdating] = useState(false); // 更新中

  // プロフィール情報を取得する関数
  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      setName(response.data.name || '');
      setEmail(response.data.email || ''); // Firebaseから取得したEmail
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
      Alert.alert('エラー', 'プロフィールの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 画面フォーカス時にプロフィールを再取得
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
    }, []),
  );

  // 更新ボタン押下時の処理
  const handleUpdate = async () => {
    if (name.trim().length === 0) {
      Alert.alert('エラー', '名前を入力してください。');
      return;
    }

    setUpdating(true);
    try {
      // PUT /api/profile を呼び出す
      const response = await api.put('/profile', {
        name: name,
      });
      // サーバーから返された最新の名前で state を更新
      setName(response.data.name);
      Alert.alert('成功', 'プロフィールを更新しました。');
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      Alert.alert('エラー', '更新に失敗しました。');
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
          editable={false} // 編集不可
        />

        <Text style={styles.label}>名前</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="表示名"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  readOnly: {
    backgroundColor: '#EFEFEF', // 編集不可のフィールドはグレーに
    color: '#666',
  },
  buttonSpacing: {
    marginTop: 20,
  },
});

export default ProfileEditScreen;
