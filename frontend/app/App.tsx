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
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
// 1. ★ api.ts はもうここでは不要 (queries.ts が使うため)
// import api from './src/services/api';
import {
  AuthContext,
  AuthContextType,
  DbUser, // 2. ★ DbUser は queries.ts と共有
} from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import MainTabNavigator from './src/navigators/MainTabNavigator';
// 3. ★ useQuery と useQueryClient をインポート
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient, // 4. ★ ログアウト時にキャッシュを操作するため
} from '@tanstack/react-query';

// 5. ★ 新しい fetchProfile をインポート
import { fetchProfile } from './src/api/queries';

LogBox.ignoreLogs(['deprecated']);

const queryClient = new QueryClient();

// 6. ★ App ロジック本体を AppWrapper から分離
// (useQuery フックが QueryClientProvider の内側で動作するため)
const App: React.FC = () => {
  // 7. ★ Firebase ユーザーの状態 (認証のみ)
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  // 8. ★ Firebase "認証" のローディング ( /profile のローディングではない)
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // 9. ★ ログアウト時にキャッシュをクリアするためのクライアント
  const queryClient = useQueryClient();

  // 10. ★ (変更) onAuthStateChanged の useEffect
  useEffect(() => {
    // 10-a. 認証状態が変わるたびに呼び出される
    const subscriber = auth().onAuthStateChanged(async fbUser => {
      setFirebaseUser(fbUser);
      setIsAuthLoading(false); // これで「Firebaseの認証チェック」は完了

      // 10-b. ★ (重要) ログアウト時
      if (!fbUser) {
        // 全てのクエリキャッシュをクリアする (['profile'] など)
        queryClient.clear();
      }
    });

    return subscriber; // 監視を解除
  }, [queryClient]); // queryClient を依存配列に追加

  // 11. ★ (NEW) /profile を React Query で取得
  const { data: user, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', firebaseUser?.uid],
    queryFn: () => fetchProfile(firebaseUser),
    enabled: !isAuthLoading && !!firebaseUser,
    staleTime: 1000 * 60 * 5,
    // ★ 追加: 登録直後は404が出やすいので、数回リトライさせる
    retry: 3,
    retryDelay: 1000, // 1秒おきにリトライ
  });

  // 12. ★ ログアウト処理 (変更)
  const handleLogout = async () => {
    try {
      await auth().signOut();
      // 12-a. ★ (重要) /profile 取得は不要に！
      // onAuthStateChanged が発火し、
      // 10-b でキャッシュクリアが実行される
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'ログアウトに失敗しました。');
    }
  };

  // 13. ★ (変更) 全体のローディング判定
  // 13-a. Firebase の認証チェック中
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // 13-b. ★ (変更) Context に渡すローディング状態
  // 1. Firebaseチェック中 (↑で弾かれる)
  // 2. もしログイン済みなら、/profile 取得中も 'loading' 扱い
  const combinedLoading = isAuthLoading || (!!firebaseUser && isProfileLoading);

  // 14. ★ (変更) Context に渡す値
  const authContextValue: AuthContextType = {
    // useQuery の結果 (user または undefined) を null に変換
    user: user || null,
    firebaseUser,
    loading: combinedLoading, // ちらつきを防ぐためのローディング状態
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <NavigationContainer>
            {/* 15. ★ (変更なし) fbUser がいればメイン、いなければ認証 */}
            {firebaseUser ? (
              <MainTabNavigator onLogout={handleLogout} />
            ) : (
              <AuthScreen />
            )}
          </NavigationContainer>
        </StripeProvider>
      </SafeAreaView>
    </AuthContext.Provider>
  );
};

// 16. ★ AppWrapper が QueryClientProvider を提供し、App を呼び出す
function AppWrapper(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

// 17. ★ default export は AppWrapper にする
export default AppWrapper;
