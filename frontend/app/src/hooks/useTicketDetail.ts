import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import SoundService from '../services/SoundService';
import { UserTicket } from '../api/queries';

/**
 * チケット詳細の状態監視とリアルタイム同期を行うフック
 */
export const useTicketDetail = (initialTicket: UserTicket) => {
  const queryClient = useQueryClient();
  const [ticket, setTicket] = useState<UserTicket>(initialTicket);

  // イベント終了判定
  const eventDate = new Date(ticket.event.event_date);
  const now = new Date();
  const isEventFinished = now.getTime() > eventDate.getTime() + 24 * 60 * 60 * 1000;

  useEffect(() => {
    // ★ 修正点1: ステータスがすでに 'used' なら監視を開始しない
    // 元の `if (ticket.status || ...)` だと 'valid' の時も止まってしまうため、明示的に比較します
    if (ticket.status === 'used' || !ticket.qr_code_id) return;

    /**
     * Firestore監視ロジック
     */
    const unsubscribe = firestore()
      .collection('ticket_status')
      .doc(ticket.qr_code_id)
      .onSnapshot(
        snapshot => {
          if (!snapshot.exists) return;

          const data = snapshot.data();

          // ★ 修正点2: Firestore側の status が 'used' になったことを検知
          // is_used 判定を削除し、status のみに統合します 
          if (data?.status === 'used') {
            
            // 成功音の再生
            SoundService.playSuccess();
            
            // ★ 修正点3: ローカルステートの更新から is_used を削除
            // UserTicket型定義から is_used を消したため、status のみ更新します
            setTicket(prev => ({
              ...prev, 
              status: 'used' 
            }));
            
            // キャッシュの無効化
            queryClient.invalidateQueries({ queryKey: ['myTickets'] });
            
            // 完了通知
            Alert.alert(
              '入場確認',
              '認証が完了しました！楽しんでください！',
              [{ text: 'OK' }]
            );
          }
        },
        error => {
          console.error('[Firestore Sync Error]:', error.message);
          if (error.message.includes('permission-denied')) {
             console.warn('所有権確認エラー: 正しいアカウントでログインしているか確認してください。');
          }
        }
      );

    return () => unsubscribe();
  }, [ticket.qr_code_id, ticket.status, queryClient]); // 依存配列に status を追加

  return {
    ticket,
    isEventFinished,
  };
};