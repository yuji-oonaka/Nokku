import axios from 'axios';
import auth from '@react-native-firebase/auth';

const baseURL = 'http://localhost:8000/api';
// const baseURL = 'http://192.168.11.7/api'; // (ポートが80番の場合)
// const baseURL = 'http://10.0.2.2:8000/api'; // (ポートが8000番の場合)


// Axiosインスタンスの作成
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ★ リクエストインターセプタ
api.interceptors.request.use(
  async config => {
    // 3. ★ 正しいクラシック構文に戻す
    const currentUser = auth().currentUser;

    if (currentUser) {
      try {
        // 4. ★ 正しいクラシック構文に戻す
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

export default api;
