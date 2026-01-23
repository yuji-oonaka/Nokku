import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
// 先ほど作成したAPI定義をインポート
import { Gacha, SpinResponse, fetchGachas, spinGacha } from '../../../api/gacha';

export const useGacha = () => {
  const [loading, setLoading] = useState(false);
  const [gachaList, setGachaList] = useState<Gacha[]>([]);

  // ガチャ一覧を取得する関数
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

  // ガチャを実行する関数
  const spin = useCallback(async (gachaId: number): Promise<SpinResponse | null> => {
    setLoading(true);
    try {
      const response = await spinGacha(gachaId);
      return response;
    } catch (error: any) {
      console.error('spin error:', error);
      // バックエンドからのエラーメッセージがあればそれを表示
      const msg = error.response?.data?.message || 'ガチャの実行に失敗しました。';
      Alert.alert('エラー', msg);
      return null;
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