import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import api from '../services/api'; // APIクライアントのパスは環境に合わせて調整してください

// 1. DBから取得するユーザー情報の型
// ★ Security Fix: 個人情報(住所・電話番号・本名)をGlobal Stateから削除
export interface DbUser {
  id: number;
  email: string;
  nickname: string;
  role: 'user' | 'artist' | 'admin';
  image_url?: string | null;
  bio?: string | null;
}

// 2. Contextが提供する値の型
export interface AuthContextType {
  user: DbUser | null; // DBのユーザー情報 (Laravel)
  firebaseUser: FirebaseAuthTypes.User | null; // Firebaseの認証情報
  loading: boolean; // 認証またはデータ取得中か
  refreshUser: () => Promise<void>; // ユーザー情報を再取得する関数
}

// 3. Context の作成
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// 4. Provider コンポーネントの実装
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // DBからユーザー情報を取得する関数
  const fetchDbUser = async () => {
    try {
      // Laravel側の '/api/me' エンドポイントを叩いて自分自身の情報を取得
      const response = await api.get('/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // エラー時はDBユーザーをnullにするが、Firebase認証は維持（リトライなどのため）
      setUser(null);
    }
  };

  useEffect(() => {
    // Firebaseの認証状態を監視
    const unsubscribe = auth().onAuthStateChanged(async currentUser => {
      setFirebaseUser(currentUser);

      if (currentUser) {
        // ログイン時はDBからも情報を取得
        await fetchDbUser();
      } else {
        // ログアウト時はDB情報もクリア
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ★ Performance Fix: useMemoでラップして不要な再レンダリングを防止
  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      loading,
      refreshUser: fetchDbUser, // プロフィール更新後などに手動で呼べるように公開
    }),
    [user, firebaseUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 5. カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider (check App.tsx)',
    );
  }
  return context;
};
