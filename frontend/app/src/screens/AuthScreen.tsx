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

// 1. ★ モジュラーAPI のインポート
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from '@react-native-firebase/auth';

import api from '../services/api'; // DB登録用のapi

// 2. ★ auth() の代わりに getAuth() を取得
const authModule = getAuth();

// 3. ★ onAuthSuccess は App.tsx から削除されたため、Props は不要
// interface AuthScreenProps {
//   onAuthSuccess: (user: any, token: string) => void;
// }

const AuthScreen: React.FC = () => {
  // 4. ★ Props を削除
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // 新規登録用の名前
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // ログイン画面か登録画面か

  /**
   * 新規登録処理
   */
  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }
    setLoading(true);
    try {
      // 5. ★ auth().createUser... を createUser... (authModule, ...) に変更
      const userCredential = await createUserWithEmailAndPassword(
        authModule,
        email,
        password,
      );

      // 6. ★ Firebase 登録成功後、Laravel DB にも登録
      //    (api.ts が自動でTokenを付与する)
      await api.post('/register', {
        name: name, // 登録時に入力した名前を送信
        // email と firebase_uid は AuthController が Token から取得
      });

      // 7. ★ App.tsx の onAuthStateChanged が検知するため、
      //    コールバック（onAuthSuccess）は不要
    } catch (error: any) {
      Alert.alert('登録エラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ログイン処理
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'Emailとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      // 8. ★ auth().signIn... を signIn... (authModule, ...) に変更
      await signInWithEmailAndPassword(authModule, email, password);

      // 9. ★ App.tsx の onAuthStateChanged が検知するため、
      //    コールバック（onAuthSuccess）は不要
    } catch (error: any) {
      Alert.alert('ログインエラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {isLogin ? 'NOKKU ログイン' : 'NOKKU 新規登録'}
        </Text>

        {!isLogin && ( // 新規登録の場合のみ名前入力
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="名前"
            placeholderTextColor="#888"
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="パスワード (6文字以上)"
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
    </SafeAreaView>
  );
};

// スタイル (ダークモード)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  input: {
    backgroundColor: '#333333',
    color: '#FFFFFF',
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
    fontSize: 16,
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
