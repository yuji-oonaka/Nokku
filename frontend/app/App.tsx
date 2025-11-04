import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar, // ステータスバーを追加
} from 'react-native';
import auth from '@react-native-firebase/auth';

// ↓↓↓ EventListScreen をインポート ↓↓↓
import EventListScreen from './src/screens/EventListScreen';

const API_URL = 'http://10.0.2.2';

function App(): React.JSX.Element {
  // フォーム入力用の状態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // UI切り替え用の状態
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);

  // ログイン後のユーザー情報
  const [userInfo, setUserInfo] = useState<any>(null);
  // ↓↓↓ 認証トークンを保持する状態を追加 ↓↓↓
  const [authToken, setAuthToken] = useState<string | null>(null);

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

      // ↓↓↓ 認証トークンをStateに保存 ↓↓↓
      setAuthToken(idToken);

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

      setUserInfo(data.user);
      // Alert.alert('ログイン成功', `おかえりなさい、${data.user.name}さん！`); // 画面が切り替わるのでアラートは不要に
    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message;
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが間違っています。';
      }
      Alert.alert('ログインエラー', errorMessage);
    } finally {
      setLoading(false);
    }
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

      // ↓↓↓ 認証トークンをStateに保存 ↓↓↓
      setAuthToken(idToken);

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

      setUserInfo(data.user);
      // Alert.alert('NOKKU 登録完了！', `ようこそ、${data.user.name}さん！`); // 画面が切り替わるのでアラートは不要に
    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています。';
      }
      Alert.alert('登録エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    setLoading(true);
    try {
      await auth().signOut();
      setUserInfo(null);
      // ↓↓↓ 認証トークンもクリア ↓↓↓
      setAuthToken(null);
      setEmail('');
      setPassword('');
      setName('');
    } catch (error: any) {
      console.error(error);
      Alert.alert('エラー', 'ログアウトに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // メインのレンダー部分
  return (
    <SafeAreaView style={styles.container}>
      {/* ダークモードに合わせてステータスバーの文字を白に */}
      <StatusBar barStyle="light-content" />

      {/* --- ログイン状態か？ --- */}
      {userInfo && authToken ? (
        // ★★★ ログイン成功時：EventListScreen を表示 ★★★
        <>
          {/* ログアウトボタンをヘッダーのように配置 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{userInfo.name}でログイン中</Text>
            <TouchableOpacity onPress={handleLogout} disabled={loading}>
              <Text style={styles.logoutButton}>
                {loading ? '...' : 'ログアウト'}
              </Text>
            </TouchableOpacity>
          </View>
          <EventListScreen authToken={authToken} />
        </>
      ) : (
        /* --- 未ログイン状態 (フォーム) --- */
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
            <ActivityIndicator
              size="large"
              color="#007AFF"
              style={styles.loader}
            />
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
      )}
    </SafeAreaView>
  );
}

// --- スタイルシート ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  // --- ログイン成功後のスタイル ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  logoutButton: {
    color: '#FF3B30', // 赤色
    fontSize: 16,
  },
  // --- フォーム用のスタイル ---
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
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

export default App;
