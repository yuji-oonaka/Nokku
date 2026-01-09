import React, { createContext, useContext } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// 1. DBから取得するユーザー情報の型
// ★ Security Fix: 個人情報(住所・電話番号・本名)をGlobal Stateから削除
// 必要な場合は、各画面でAPI(/api/profile)を叩いて取得すること。
export interface DbUser {
  id: number;
  email: string;
  // real_name: string; // 削除: 本名は必要な時だけ取得
  nickname: string; // 表示用なのでOK
  role: 'user' | 'artist' | 'admin';
  image_url?: string | null; // アイコンも表示用なのでOK
  bio?: string | null;
  // 削除: 以下の住所情報はここには持たせない
  // phone_number: string | null;
  // postal_code: string | null;
  // prefecture: string | null;
  // city: string | null;
  // address_line1: string | null;
  // address_line2: string | null;
}

// 2. Contextが提供する値の型
export interface AuthContextType {
  user: DbUser | null; // DBのユーザー情報
  firebaseUser: FirebaseAuthTypes.User | null; // Firebaseの認証情報
  loading: boolean; // 認証処理中か
}

// 3. Context の作成 (器)
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
