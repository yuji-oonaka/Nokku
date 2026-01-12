import { useState } from 'react';
import { Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import api from '../../../services/api'; // パス階層に合わせて調整してください

export type AuthMode = 'login' | 'register' | 'reset';

export const useAuthForm = () => {
  // --- State ---
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  
  // フォーム入力値
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');

  // --- Actions ---

  /**
   * ログイン処理
   */
  const login = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'Emailとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      // 成功時は AuthContext の onAuthStateChanged が検知して画面遷移する
    } catch (error: any) {
      console.error('Login Error:', error);
      let msg = 'ログインに失敗しました。';
      if (error.code === 'auth/invalid-email') msg = 'メールアドレスの形式が不正です。';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = 'メールアドレスまたはパスワードが間違っています。';
      }
      Alert.alert('ログインエラー', msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 新規登録処理（トランザクション風ロールバック付き）
   */
  const register = async () => {
    // バリデーション
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
      // 1. Firebase Auth でユーザー作成
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      // 2. Laravel API にユーザー情報を登録
      try {
        await api.post('/register', {
          real_name: realName,
          nickname: nickname,
          email: email,
          firebase_uid: userCredential.user.uid, // UIDを紐付け用に送信
        });
      } catch (apiError: any) {
        // ★ Security Fix: API登録失敗時はFirebaseユーザーを即削除（ロールバック）
        console.error('API Register Error -> Rolling back Firebase User', apiError);
        await userCredential.user.delete(); 
        throw apiError; // 外側のcatchへ投げる
      }

    } catch (error: any) {
      console.error('Registration Error:', error);
      let msg = '登録処理に失敗しました。';
      
      // Laravel側のバリデーションエラー (422)
      if (error.response?.status === 422) {
        // エラーメッセージが配列などで返る場合は適宜パースが必要ですが、一旦代表的なものを表示
        msg = '入力内容に不備があります（既に使用されているニックネーム等）。';
      } 
      // Firebase側のエラー
      else if (error.code === 'auth/email-already-in-use') {
        msg = 'そのメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/weak-password') {
        msg = 'パスワードが脆弱です。';
      }
      
      Alert.alert('登録エラー', msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * パスワードリセット処理
   */
  const resetPassword = async () => {
    if (!email) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert('送信完了', '再設定メールを送信しました。\nメール内のリンクから再設定してください。', [
        { text: 'OK', onPress: () => setMode('login') }
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('エラー', 'メール送信に失敗しました。アドレスが正しいか確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    setMode,
    loading,
    form: { email, setEmail, password, setPassword, realName, setRealName, nickname, setNickname },
    actions: { login, register, resetPassword }
  };
};