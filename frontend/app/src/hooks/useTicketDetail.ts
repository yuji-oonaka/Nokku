import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import SoundService from '../services/SoundService';
import { UserTicket } from '../api/queries';

export const useTicketDetail = (initialTicket: UserTicket) => {
  const queryClient = useQueryClient();
  const [ticket, setTicket] = useState<UserTicket>(initialTicket);

  // イベント終了判定
  const eventDate = new Date(ticket.event.event_date);
  const now = new Date();
  const isEventFinished = now.getTime() > eventDate.getTime() + 24 * 60 * 60 * 1000;

  // Firestore監視
  useEffect(() => {
    // 既に完了またはQRなしなら監視しない
    if (ticket.is_used || !ticket.qr_code_id) return;

    const unsubscribe = firestore()
      .collection('ticket_status')
      .doc(ticket.qr_code_id)
      .onSnapshot(
        snapshot => {
          const data = snapshot.data();
          if (data?.status === 'used') {
            // 入場検知！
            SoundService.playSuccess();
            
            setTicket(prev => ({ ...prev, is_used: true }));
            
            // リスト情報のキャッシュを更新
            queryClient.invalidateQueries({ queryKey: ['myTickets'] });
            
            Alert.alert('入場確認', '認証が完了しました！楽しんでください！');
          }
        },
        error => {
          console.error('Firestore sync error:', error);
        }
      );

    return () => unsubscribe();
  }, [ticket.qr_code_id, ticket.is_used, queryClient]);

  return {
    ticket,
    isEventFinished,
  };
};