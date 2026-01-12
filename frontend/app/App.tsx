import React from 'react';
import {
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  View,
  LogBox,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ★ 作成したAuthProviderとuseAuthをインポート
import { AuthProvider, useAuth } from './src/context/AuthContext';

// ★ ナビゲーターと画面
import MainTabNavigator from './src/navigators/MainTabNavigator';
import AuthScreen from './src/features/auth/AuthScreen';

LogBox.ignoreLogs(['deprecated']);

// React Query Clientの初期化
const queryClient = new QueryClient();

// ★ コンテンツ表示用コンポーネント (AuthContextを利用するため分離)
const AppContent: React.FC = () => {
  // AuthContextから必要な状態と関数だけで取得（ロジックはあちらに任せる）
  const { firebaseUser, loading, logout } = useAuth();

  // 1. ローディング画面 (Firebase初期化 or プロフィール取得中)
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // 2. メイン描画
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <NavigationContainer>
          {firebaseUser ? (
            // ログイン済み: メインタブへ (logout関数を渡して既存実装を維持)
            <MainTabNavigator onLogout={logout} />
          ) : (
            // 未ログイン: 認証画面へ
            <AuthScreen />
          )}
        </NavigationContainer>
      </StripeProvider>
    </SafeAreaView>
  );
};

// ★ アプリのルートコンポーネント
// プロバイダーの階層構造を定義するだけにする
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default App;
