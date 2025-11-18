import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

// 画面モードの型定義
type AuthMode = 'login' | 'register' | 'reset';

const AuthScreen: React.FC = () => {
  // フォームの状態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');

  // UIの状態
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');

  // --- アクションハンドラ ---

  // 1. ログイン処理
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'Emailとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      // 成功すると App.tsx の onAuthStateChanged が反応して画面遷移します
    } catch (error: any) {
      console.error(error);
      let msg = 'ログインに失敗しました。';
      if (error.code === 'auth/invalid-email')
        msg = 'メールアドレスの形式が不正です。';
      if (error.code === 'auth/user-not-found')
        msg = 'ユーザーが見つかりません。';
      if (error.code === 'auth/wrong-password')
        msg = 'パスワードが間違っています。';
      if (error.code === 'auth/invalid-credential')
        msg = '認証情報が正しくありません。';
      Alert.alert('ログインエラー', msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. 新規登録処理
  const handleRegister = async () => {
    if (!email || !password || !realName || !nickname) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }
    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return;
    }
    setLoading(true);
    try {
      // Firebase Auth でユーザー作成
      await auth().createUserWithEmailAndPassword(email, password);

      // Laravel API にユーザー情報を登録
      // (Firebaseの作成成功後に実行することで、整合性を保つ)
      await api.post('/register', {
        real_name: realName,
        nickname: nickname,
      });
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (error.response && error.response.status === 422) {
        msg = 'そのニックネームは既に使用されています。';
      } else if (error.code === 'auth/email-already-in-use') {
        msg = 'そのメールアドレスは既に使用されています。';
      }
      Alert.alert('登録エラー', msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. ★ パスワードリセットメール送信処理
  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert(
        '送信完了',
        'パスワード再設定用のメールを送信しました。\nメール内のリンクから新しいパスワードを設定してください。',
        [{ text: 'ログイン画面に戻る', onPress: () => setMode('login') }],
      );
    } catch (error: any) {
      console.error(error);
      let msg = 'メールの送信に失敗しました。';
      if (error.code === 'auth/user-not-found')
        msg = 'このメールアドレスは登録されていません。';
      if (error.code === 'auth/invalid-email')
        msg = 'メールアドレスの形式が不正です。';
      Alert.alert('エラー', msg);
    } finally {
      setLoading(false);
    }
  };

  // --- UIレンダリング ---

  const renderTitle = () => {
    switch (mode) {
      case 'login':
        return 'NOKKU ログイン';
      case 'register':
        return 'NOKKU 新規登録';
      case 'reset':
        return 'パスワードの再設定';
    }
  };

  const renderButtonTitle = () => {
    switch (mode) {
      case 'login':
        return 'ログイン';
      case 'register':
        return '登録する';
      case 'reset':
        return '再設定メールを送信';
    }
  };

  const handleMainAction = () => {
    switch (mode) {
      case 'login':
        return handleLogin();
      case 'register':
        return handleRegister();
      case 'reset':
        return handlePasswordReset();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.form}>
            <Text style={styles.title}>{renderTitle()}</Text>

            {/* 登録モードのみ表示: 名前入力 */}
            {mode === 'register' && (
              <>
                <Text style={styles.label}>本名 (非公開)</Text>
                <TextInput
                  style={styles.input}
                  value={realName}
                  onChangeText={setRealName}
                  placeholder="例: 山田 太郎 (決済用)"
                  placeholderTextColor="#888"
                  autoCapitalize="words"
                />
                <Text style={styles.label}>ニックネーム (公開)</Text>
                <TextInput
                  style={styles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="例: ノックファン (表示用)"
                  placeholderTextColor="#888"
                  autoCapitalize="none"
                />
              </>
            )}

            {/* 全モードで表示: Email */}
            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* リセットモード以外で表示: Password */}
            {mode !== 'reset' && (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>パスワード</Text>
                  {/* ログイン時のみ: パスワード忘れリンク */}
                  {mode === 'login' && (
                    <TouchableOpacity onPress={() => setMode('reset')}>
                      <Text style={styles.forgotPasswordText}>忘れた場合</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="6文字以上"
                  placeholderTextColor="#888"
                  secureTextEntry
                />
              </>
            )}

            {/* メインボタン */}
            <View style={styles.buttonSpacing}>
              {loading ? (
                <ActivityIndicator size="large" color="#0A84FF" />
              ) : (
                <Button
                  title={renderButtonTitle()}
                  onPress={handleMainAction}
                  color="#0A84FF"
                />
              )}
            </View>

            {/* モード切替リンク */}
            <View style={styles.footerLinks}>
              {mode === 'login' && (
                <TouchableOpacity onPress={() => setMode('register')}>
                  <Text style={styles.linkText}>
                    アカウントをお持ちでない方は{' '}
                    <Text style={styles.linkHighlight}>新規登録</Text>
                  </Text>
                </TouchableOpacity>
              )}

              {mode === 'register' && (
                <TouchableOpacity onPress={() => setMode('login')}>
                  <Text style={styles.linkText}>
                    すでにアカウントをお持ちの方は{' '}
                    <Text style={styles.linkHighlight}>ログイン</Text>
                  </Text>
                </TouchableOpacity>
              )}

              {mode === 'reset' && (
                <TouchableOpacity onPress={() => setMode('login')}>
                  <Text style={styles.linkText}>
                    <Text style={styles.linkHighlight}>ログイン画面に戻る</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonSpacing: {
    marginTop: 30,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0A84FF',
    fontSize: 13,
  },
  footerLinks: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    color: '#888',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#0A84FF',
    fontWeight: 'bold',
  },
});

export default AuthScreen;
