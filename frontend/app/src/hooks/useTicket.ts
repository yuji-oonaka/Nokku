import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseTicket } from '../api/ticketApi';
import { Alert } from 'react-native';
import SoundService from '../services/SoundService';

export const usePurchaseTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseTicket,
    onSuccess: (data) => {
      SoundService.playSuccess();
      
      // 1. マイチケット一覧を更新
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      // 2. イベント詳細（在庫数）を更新
      queryClient.invalidateQueries({ queryKey: ['eventDetail'] });

      Alert.alert(
        '購入完了', 
        `チケットを購入しました！\n座席: ${data.ticket.seat_number}\n\n「マイチケット」からQRコードを確認できます。`,
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      SoundService.playError();
      console.log('Purchase Error:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'チケットの購入に失敗しました。';
      Alert.alert('購入エラー', errorMessage);
    },
  });
};