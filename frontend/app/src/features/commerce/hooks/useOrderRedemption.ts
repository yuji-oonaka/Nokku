import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import SoundService from '../../../services/SoundService';
import { Order } from '../../../api/queries';

export const useOrderRedemption = (initialOrder: Order) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const queryClient = useQueryClient();
  
  // 多重処理防止用 Ref
  const isProcessedRef = useRef(false);

  useEffect(() => {
    /**
     * 監視条件のチェック
     * ステータスを 'completed' (バックエンドの完了状態) に同期
     */
    if (
      initialOrder.status === 'completed' || // ★ 'redeemed' から修正
      initialOrder.delivery_method !== 'venue' ||
      !initialOrder.qr_code_id
    ) {
      return;
    }

    console.log('Firestore監視開始 (Order):', initialOrder.qr_code_id);

    const unsubscribe = firestore()
      .collection('order_status')
      .doc(initialOrder.qr_code_id)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot.exists) return;
          const data = snapshot.data();

          if (isProcessedRef.current) return;

          /**
           * 受取完了の検知
           * バックエンドの TicketAdmissionService.processOrderRedemption と同期
           */
          if (data?.status === 'completed') { // ★ 'redeemed' から修正
            console.log('グッズ引換検知: 処理を開始します');
            
            isProcessedRef.current = true;
            SoundService.playSuccess();

            // ローカルステートを 'completed' に更新
            setOrder((prev) => ({ ...prev, status: 'completed' }));

            // React Query のキャッシュを更新して一覧画面等にも反映
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });

            Alert.alert('受取完了', 'グッズのお渡しが完了しました！');
          }
        },
        (error) => {
          console.error('Firestore Order Sync Error:', error);
        }
      );

    return () => unsubscribe();
  }, [
    initialOrder.qr_code_id,
    initialOrder.delivery_method,
    initialOrder.status,
    queryClient,
  ]);

  return order;
};