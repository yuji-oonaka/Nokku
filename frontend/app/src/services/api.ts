import axios from 'axios';
import auth from '@react-native-firebase/auth';

/**
 * AndroidエミュレータからホストOS(Windows)のlocalhostで動作する
 * Laravel Sail (WSL) に接続するためのベースURL。
 * * - '10.0.2.2' は Androidエミュレータにとっての「ホストOSのlocalhost」を指します。
 * - SailのデフォルトWebサーバーポート (80) を想定しています。
 * - バックエンドのAPIルートは '/api' から始まるため、'/api' を末尾に付けます。
 */
const baseURL = 'http://10.0.2.2/api';

// ※もし 'sail up' が 80番ポート以外 (例: 8000番) でマッピングされている場合は、
// const baseURL = 'http://10.0.2.2:8000/api';
// のようにポート番号を明記してください。

// Axiosインスタンスの作成
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json', // LaravelがJSONレスポンスを返すように要求
  },
});

// ★重要: リクエストインターセプタ
// api を使ったすべてのリクエストが送信される「前」に、この処理が割り込みます。
api.interceptors.request.use(
  async config => {
    // 現在のFirebaseユーザーを取得
    const currentUser = auth().currentUser;

    if (currentUser) {
      try {
        // FirebaseユーザーからIDトークンを取得 (期限切れなら自動更新)
        const token = await currentUser.getIdToken();

        // リクエストヘッダーに 'Authorization: Bearer [トークン]' を追加
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Failed to get Firebase token:', error);
      }
    }

    // 設定を更新してリクエストを続行
    return config;
  },
  error => {
    // リクエスト設定エラー
    return Promise.reject(error);
  },
);

export default api;
