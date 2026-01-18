import { useMutation } from '@tanstack/react-query';
import api from '../../../services/api'; // ★修正: { } を外す
import { ConsumePointResponse } from '../types';

// ポイント消費APIを叩く関数
const consumeMessagePoint = async (params: { eventId: string; roomId: string }) => {
  const { data } = await api.post<ConsumePointResponse>('/event-chat/consume-message', {
    event_id: params.eventId,
    room_id: params.roomId,
  });
  return data;
};

const consumeRoomCreatePoint = async (eventId: string) => {
  const { data } = await api.post<ConsumePointResponse>('/event-chat/consume-room', {
    event_id: eventId,
  });
  return data;
};

// コンポーネントで使うカスタムフック
export const useEventChatApi = () => {
  // メッセージ送信ポイント消費
  const messageMutation = useMutation({
    mutationFn: consumeMessagePoint,
  });

  // ルーム作成ポイント消費
  const roomCreateMutation = useMutation({
    mutationFn: consumeRoomCreatePoint,
  });

  return {
    consumeForMessage: messageMutation.mutateAsync,
    consumeForRoomCreate: roomCreateMutation.mutateAsync,
    isConsuming: messageMutation.isPending || roomCreateMutation.isPending,
  };
};