import axios, { AxiosError } from 'axios';
import auth from '@react-native-firebase/auth';

// 開発環境用の設定（必要に応じて環境変数化を推奨）
const baseURL = 'http://localhost:8000/api'; 
// const baseURL = 'http://10.0.2.2:8000/api'; // Android Emulator用

// 1. ★ 401エラー時のコールバックを保持する変数
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * 外部（AuthContext）から401時の処理（ログアウト等）を登録するための関数
 * これにより api.ts が AuthContext に依存するのを防ぐ
 */
export const registerUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Axiosインスタンスの作成
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000, // 念のためタイムアウト設定を追加（10秒）
});

// ★ リクエストインターセプタ (既存のコードを維持)
api.interceptors.request.use(
  async config => {
    const currentUser = auth().currentUser;

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Firebase token 取得に失敗:', error);
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// 2. ★ レスポンスインターセプタ (新規追加)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // 401 Unauthorized が返ってきた場合
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized detected.');
      
      // 登録されたコールバック（ログアウト処理）があれば実行
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;