import React, { createContext, useContext } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// 1. DBから取得するユーザー情報の型
export interface DbUser {
  id: number;
  email: string;
  real_name: string;
  nickname: string;
  role: 'user' | 'artist' | 'admin';

  // ↓↓↓ ここから6行を追記してください ↓↓↓
  phone_number: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address_line1: string | null;
  address_line2: string | null;
}

// 2. Contextが提供する値の型
export interface AuthContextType {
  user: DbUser | null; // DBのユーザー情報 (role を含む)
  firebaseUser: FirebaseAuthTypes.User | null; // Firebaseの認証情報
  loading: boolean; // 認証処理中か
}

// 3. Context の作成 (器)
//    (Provider は App.tsx が担当する)
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// 4. 簡単に Context を利用するためのカスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider (check App.tsx)',
    );
  }
  return context;
};
