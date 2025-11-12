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
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import api from '../services/api';

const authModule = getAuth();

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState(''); // 本名
  const [nickname, setNickname] = useState(''); // 公開名
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleRegister = async () => {
    if (!email || !password || !realName || !nickname) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        authModule,
        email,
        password,
      );

      await api.post('/register', {
        real_name: realName,
        nickname: nickname,
      });
      // (App.tsx の onAuthStateChanged が自動でログイン処理)
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        Alert.alert('登録エラー', 'そのニックネームは既に使用されています。');
      } else {
        Alert.alert('登録エラー', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'Emailとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(authModule, email, password);
    } catch (error: any) {
      Alert.alert('ログインエラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <Text style={styles.title}>
            {isLogin ? 'NOKKU ログイン' : 'NOKKU 新規登録'}
          </Text>

          {!isLogin && (
            <>
              <Text style={styles.label}>本名 (非公開)</Text>
              <TextInput
                style={styles.input}
                value={realName}
                onChangeText={setRealName}
                placeholder="（チケット購入・決済用）"
                placeholderTextColor="#888"
                autoCapitalize="words"
              />
              <Text style={styles.label}>ニックネーム (公開)</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="（チャット・投稿用）"
                placeholderTextColor="#888"
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={styles.label}>
            {isLogin ? 'メールアドレス' : 'Email (ログイン用)'}
          </Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="メールアドレス"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>
            {isLogin ? 'パスワード' : 'パスワード (6文字以上)'}
          </Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="パスワード"
            placeholderTextColor="#888"
            secureTextEntry
          />

          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button
                title={isLogin ? 'ログイン' : '登録する'}
                onPress={isLogin ? handleLogin : handleRegister}
              />
            </View>
          )}

          <View style={styles.toggleButton}>
            <Button
              title={
                isLogin
                  ? 'アカウントをお持ちでないですか？ 新規登録'
                  : 'すでにアカウントをお持ちですか？ ログイン'
              }
              onPress={() => setIsLogin(!isLogin)}
              color="#0A84FF"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ★★★ 構文エラーを修正した完全な styles オブジェクト
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  form: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  buttonSpacing: {
    marginTop: 10,
    marginBottom: 10,
  },
  toggleButton: {
    marginTop: 15,
  },
});

export default AuthScreen;
