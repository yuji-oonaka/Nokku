import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Button,
  Alert,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';

const API_URL = 'http://10.0.2.2';

// ★重要★
// 認証成功時に App.tsx に情報を伝えるための Props を定義
interface Props {
  onAuthSuccess: (user: any, token: string) => void;
}

const AuthScreen: React.FC<Props> = ({ onAuthSuccess }) => {
  // フォーム入力用の状態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // UI切り替え用の状態
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);

  /**
   * ログイン処理
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);

    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password,
      );
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'ログインに失敗しました');
      }

      // ★ 認証成功を App.tsx に通知
      onAuthSuccess(data.user, idToken);
    } catch (error: any) {
      setLoading(false);
      console.error(error);
      let errorMessage = error.message;
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが間違っています。';
      }
      Alert.alert('ログインエラー', errorMessage);
    }
    // (finallyブロックは onAuthSuccess が呼ばれるので不要)
  };

  /**
   * 会員登録処理
   */
  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }
    setLoading(true);

    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password,
      );
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name: name }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Laravel APIでの登録に失敗しました');
      }

      // ★ 認証成功を App.tsx に通知
      onAuthSuccess(data.user, idToken);
    } catch (error: any) {
      setLoading(false);
      console.error(error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています。';
      }
      Alert.alert('登録エラー', errorMessage);
    }
  };

  // --- UI (App.tsxからフォーム部分だけを抜粋) ---
  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>NOKKU</Text>
      <Text style={styles.subtitle}>
        {isLoginView ? 'ログイン' : '新規登録'}
      </Text>

      {!isLoginView && (
        <TextInput
          style={styles.input}
          placeholder="名前"
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
          placeholderTextColor="#888"
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード (6文字以上)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#888"
      />

      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      )}

      {!loading && (
        <Button
          title={isLoginView ? 'ログイン' : '新規登録'}
          onPress={isLoginView ? handleLogin : handleRegister}
        />
      )}

      <View style={styles.buttonSpacer} />

      <TouchableOpacity
        onPress={() => setIsLoginView(!isLoginView)}
        disabled={loading}
      >
        <Text style={styles.toggleText}>
          {isLoginView
            ? 'アカウントをお持ちでないですか？ 新規登録'
            : 'すでにアカウントをお持ちですか？ ログイン'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// --- スタイルシート (App.tsxからコピー) ---
const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#121212', // 背景色をここで指定
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    backgroundColor: '#333',
    fontSize: 16,
  },
  buttonSpacer: {
    height: 20,
  },
  loader: {
    marginVertical: 20,
  },
  toggleText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});

export default AuthScreen;
