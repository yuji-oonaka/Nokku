import { useState } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';

export type SeatingType = 'random' | 'free';

interface UseTicketTypeCreateProps {
  eventId?: number;
  onSuccess: () => void;
}

export const useTicketTypeCreate = ({ eventId, onSuccess }: UseTicketTypeCreateProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [seatingType, setSeatingType] = useState<SeatingType>('random');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const priceNum = parseInt(price, 10);
    const capacityNum = parseInt(capacity, 10);

    // バリデーション
    if (!name.trim()) {
      Alert.alert('エラー', '券種名を入力してください。');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('エラー', '価格を正しく入力してください。');
      return;
    }
    if (isNaN(capacityNum) || capacityNum <= 0) {
      Alert.alert('エラー', 'キャパシティ（席数）を正しく入力してください。');
      return;
    }
    if (!eventId) {
      Alert.alert('エラー', 'イベントIDが見つかりません。');
      return;
    }

    setLoading(true);
    try {
      await api.post('/ticket-types', {
        event_id: eventId,
        name: name,
        price: priceNum,
        capacity: capacityNum,
        seating_type: seatingType,
      });

      Alert.alert('成功', '新しい券種を作成しました。', [
        { text: 'OK', onPress: onSuccess }
      ]);
    } catch (error: any) {
      console.error('券種作成エラー:', error);
      const message = error.response?.data?.message || '券種の作成に失敗しました。';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return {
    formState: { name, price, capacity, seatingType },
    setters: { setName, setPrice, setCapacity, setSeatingType },
    loading,
    handleSubmit,
  };
};