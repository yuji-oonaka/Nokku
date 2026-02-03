import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { claimLoginBonus } from '../api/queries';
import { useNavigation } from '@react-navigation/native';

export const useLoginBonus = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  // 連打防止・重複リクエスト防止（セッション内キャッシュ）
  const processedToday = useRef<string | null>(null);

  useEffect(() => {
    const checkBonus = async () => {
      // ★地雷撤去：ISOString(UTC)ではなく、ローカルの日付(YYYY-MM-DD)を取得
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // 既にこのセッションで今日チェック済みならAPIを叩かない
      if (processedToday.current === today) return;

      try {
        const result = await claimLoginBonus();

        // バックエンドが claimed: true (付与成功) を返した時のみアラートを出す
        // スタッフアカウントや取得済みの場合は false が返るので表示されない
        if (result.claimed) {
          // ポイント表示を即座に更新 ('profile' クエリを無効化して再取得)
          await queryClient.invalidateQueries({ queryKey: ['profile'] });

          // ★真実の同期：バックエンドから届いた dynamic なメッセージを表示
          // 運営が Filament でポイントを変えれば、ここも自動で「10pt獲得！」等に変わる
          Alert.alert(
            '🎁 ログインボーナス',
            result.message,
            [{ text: 'OK' }]
          );
        }

        // 成功（付与）または「取得済み」の正常レスポンスが来たらマーク
        processedToday.current = today;

      } catch (error) {
        // ネットワークエラー等はログに留め、ユーザー体験を損なわないよう静かに処理
        console.log('Bonus check silent fail:', error);
      }
    };

    // 画面にフォーカスが当たるたびに実行（一日一度の判定は内部で行う）
    const unsubscribe = navigation.addListener('focus', () => {
      checkBonus();
    });

    return unsubscribe;
  }, [navigation, queryClient]);
};