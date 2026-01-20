import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { claimLoginBonus } from '../api/queries';
import { useNavigation } from '@react-navigation/native';

export const useLoginBonus = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  // 連打防止・重複リクエスト防止
  const processedToday = useRef<string | null>(null);

  useEffect(() => {
    const checkBonus = async () => {
      const today = new Date().toISOString().split('T')[0];

      // 既に今日チェック済みならAPIを叩かない
      if (processedToday.current === today) return;

      try {
        const result = await claimLoginBonus();

        // ★ ここが重要: claimed が true の時だけ動く
        // Staffの場合は false が返るので、ifの中には絶対に入らない
        if (result.claimed) {
            
          // ポイント表示を即座に更新 ('user' ではなく 'profile' に修正済み)
          await queryClient.invalidateQueries({ queryKey: ['profile'] });

          // User/Artist にだけ出る
          Alert.alert(
            '🎁 ログインボーナス',
            result.message,
            [{ text: 'OK' }]
          );
        }

        // 成功しても失敗しても「今日はもうチェックした」とマークする
        processedToday.current = today;

      } catch (error) {
        // ネットワークエラー等も静かに無視
        console.log('Bonus check silent fail:', error);
      }
    };

    // 画面が表示されるたびにチェック
    const unsubscribe = navigation.addListener('focus', () => {
      checkBonus();
    });

    return unsubscribe;
  }, [navigation, queryClient]);
};