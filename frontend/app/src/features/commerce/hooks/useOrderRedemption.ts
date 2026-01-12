import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import SoundService from '../../../services/SoundService';
import { Order } from '../../../api/queries';

export const useOrderRedemption = (initialOrder: Order) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const queryClient = useQueryClient();
  
  // 無限ループ・多重処理防止用 Ref
  const isProcessedRef = useRef(false);

  useEffect(() => {
    // 監視条件のチェック
    if (
      initialOrder.status === 'redeemed' ||
      initialOrder.delivery_method !== 'venue' ||
      !initialOrder.qr_code_id
    ) {
      return;
    }

    console.log('Firestore監視開始:', initialOrder.qr_code_id);

    const unsubscribe = firestore()
      .collection('order_status')
      .doc(initialOrder.qr_code_id)
      .onSnapshot(
        (snapshot) => {
          const data = snapshot.data();

          if (isProcessedRef.current) return;

          if (data?.status === 'redeemed') {
            console.log('受取検知: 処理を開始します');
            
            // 1. フラグを立てる
            isProcessedRef.current = true;

            // 2. 音を鳴らす
            SoundService.playSuccess();

            // 3. 画面更新
            setOrder((prev) => ({ ...prev, status: 'redeemed' }));

            // 4. キャッシュ更新
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });

            // 5. 通知
            Alert.alert('受取完了', 'グッズのお渡しが完了しました！');
          }
        },
        (error) => {
          console.error('Firestore監視エラー:', error);
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