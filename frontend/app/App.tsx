import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  View,
  LogBox,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { NavigationContainer } from '@react-navigation/native'; // ナビゲーションの土台

// 作成した「部品」をインポート
import AuthScreen from './src/screens/AuthScreen';
import MainTabNavigator from './src/navigators/MainTabNavigator';
import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Qgcy2LcIj5T4QhV0jVJkodwrPUsAMcX7zJxrqd6BzQXsRymODECYjSU8cmVsschRoLK6EVSuFu6MgGgLmtBvY3d00o7lGExMI';
const API_URL = 'http://10.0.2.2';

function App(): React.JSX.Element {
  // ログイン後のユーザー情報
  const [userInfo, setUserInfo] = useState<any>(null);
  // 認証トークン
  const [authToken, setAuthToken] = useState<string | null>(null);
  // アプリ起動時の認証チェック中フラグ
  const [initializing, setInitializing] = useState(true);

  /**
   * 認証状態リスナー (アプリ起動時に一度だけ実行)
   */
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async user => {
      
      // ↓↓↓ このロジックを修正します ↓↓↓

      // 1. アプリ起動時のチェック（initializing が true の時）だけ実行
      if (initializing) {
        if (user) {
          // 以前のセッションが残っていた場合、DBからユーザー情報を取得
          try {
            const idToken = await user.getIdToken();
            const response = await fetch(`${API_URL}/api/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
            });
            if (!response.ok) {
              throw new Error('自動ログインでのユーザー情報取得に失敗');
            }
            const data = await response.json();
            setUserInfo(data.user);
            setAuthToken(idToken);
          } catch (error) {
            // DBにいない/トークン無効なら強制ログアウト
            console.error(error);
            await auth().signOut();
            setUserInfo(null);
            setAuthToken(null);
          }
        }
        // 起動時チェック完了
        setInitializing(false);

      } else {
        // 2. 起動時以外（＝手動ログアウト時）
        if (!user) {
          // ユーザーが null になったら（ログアウト）、状態をクリア
          setUserInfo(null);
          setAuthToken(null);
        }
        // （手動ログイン/登録時は AuthScreen の onAuthSuccess が
        // 　状態をセットするので、ここでは何もしない）
      }
    });
    return subscriber; // cleanup
  }, [initializing]);

  /**
   * 認証成功時のコールバック
   * (AuthScreen から呼び出される)
   */
  const handleAuthSuccess = (user: any, token: string) => {
    setUserInfo(user);
    setAuthToken(token);
  };

  /**
   * ログアウト処理
   * (MainTabNavigator へ渡す)
   */
  const handleLogout = async () => {
    try {
      await auth().signOut();
      setUserInfo(null);
      setAuthToken(null);
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'ログアウトに失敗しました。');
    }
  };

  // --- アプリ起動時のローディング画面 ---
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // --- メインのレンダー ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <NavigationContainer>
          {/* authToken と userInfo が存在するか？ (ログイン済みか？) */}
          {userInfo && authToken ? (
            // ログイン済み：メインのタブナビゲーターを表示
            <MainTabNavigator authToken={authToken} onLogout={handleLogout} />
          ) : (
            // 未ログイン：認証フォームを表示
            <AuthScreen onAuthSuccess={handleAuthSuccess} />
          )}
        </NavigationContainer>
      </StripeProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // 全体の背景色をダークに
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default App;
