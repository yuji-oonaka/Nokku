import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { registerUnauthorizedCallback } from '../services/api';

// ★ 元々使っていた fetchProfile をインポート (パスは環境に合わせてください)
import { fetchProfile } from '../api/queries';

// 1. DBから取得するユーザー情報の型 (queries.tsの定義と合わせる)
export interface DbUser {
  id: number;
  email: string;
  nickname: string;
  role: 'user' | 'artist' | 'admin' | 'staff';
  image_url?: string | null;
  bio?: string | null;
  points: number;
  firebase_uid: string;
  current_icon_id?: number | null;
}

// 2. Contextが提供する値の型
export interface AuthContextType {
  user: DbUser | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  // ログアウト処理
  const logout = async () => {
    try {
      await auth().signOut();
      // ★ ログアウト時はキャッシュをクリア (元のコードの挙動を再現)
      queryClient.clear();
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // api.ts へのコールバック登録
  useEffect(() => {
    registerUnauthorizedCallback(() => {
      logout();
    });
  }, []);

  // Firebase Auth Stateの監視
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setFirebaseUser(currentUser);
      setIsAuthInitializing(currentUser);
    });
    return unsubscribe;
  }, []);

  // Firebaseの状態確定時の処理
  const setIsAuthInitializing = (user: FirebaseAuthTypes.User | null) => {
    setIsAuthLoading(false);
    if (!user) {
      queryClient.clear();
    }
  };

  // ★ 以前動いていたロジックを完全再現
  const {
    data: user,
    isLoading: isProfileLoading,
    refetch: refreshUser,
  } = useQuery({
    // ★ キーを 'me' から 'profile' に戻す
    queryKey: ['profile', firebaseUser?.uid],
    // ★ fetchProfile 関数を使用する (これが重要)
    queryFn: () => fetchProfile(firebaseUser),
    enabled: !isAuthLoading && !!firebaseUser,
    staleTime: 1000 * 60 * 5,
    // ★ リトライ設定を復活
    retry: 3,
    retryDelay: 1000,
  });

  // 全体のローディング判定
  const loading = isAuthLoading || (!!firebaseUser && isProfileLoading);

  const value = useMemo(
    () => ({
      user: user || null,
      firebaseUser,
      loading,
      logout,
      refreshUser,
    }),
    [user, firebaseUser, loading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
