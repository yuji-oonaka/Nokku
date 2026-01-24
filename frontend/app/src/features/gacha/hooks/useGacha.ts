import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
// ★追加: axiosのインスタンスをインポート (パスは環境に合わせて調整してください)
import api from '../../../services/api'; 
import { Gacha, fetchGachas } from '../../../api/gacha';

export const useGacha = () => {
  const [loading, setLoading] = useState(false);
  const [gachaList, setGachaList] = useState<Gacha[]>([]);

  // ガチャ一覧を取得
  const loadGachas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGachas();
      setGachaList(data);
    } catch (error: any) {
      console.error('loadGachas error:', error);
      Alert.alert('エラー', 'ガチャ情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  // ガチャを実行 (spin)
  const spin = useCallback(async (gachaId: number) => {
    setLoading(true);
    try {
      // ★ここが修正ポイント！
      // 別の関数を使わず、ここで直接「正しい形」のデータを作って送ります。
      // これで "gacha_id" が確実に送信されます。
      const payload = { 
        gacha_id: gachaId,
        count: 1 
      };

      console.log('ガチャリクエスト送信:', payload); // 送るデータを確認

      // APIを叩く (URLは routes/api.php で設定したもの)
      const response = await api.post('/gacha/spin', payload);
      
      return response.data;

    } catch (error: any) {
      console.error('spin error details:', error);
      
      // エラーの詳細判定
      const status = error.response?.status;
      const data = error.response?.data;
      
      if (status === 422) {
        // ★重要: バリデーションエラーの中身をログに出す
        console.log('バリデーションエラー詳細:', data.errors);
        Alert.alert('エラー', 'データの送信形式が正しくありません(422)');
      } else if (status === 400) {
        Alert.alert('ポイント不足', data?.message || 'ポイントが足りません');
      } else {
        Alert.alert('エラー', data?.message || 'ガチャの実行に失敗しました');
      }
      
      return null; // エラー時はnullを返す
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    gachaList,
    loadGachas,
    spin,
  };
};