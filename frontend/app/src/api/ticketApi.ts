import api from '../services/api';

// チケット種類の型定義
export interface TicketType {
  id: number;
  event_id: number;
  name: string;
  price: number;
  capacity: number;
  remaining: number; // ★ 追加: バックエンドから送られてくる残り枚数
  seating_type: 'random' | 'free';
}

// 購入完了時のレスポンス型
export interface PurchaseResponse {
  message: string;
  ticket: {
    id: number;
    seat_number: string;
    qr_code_id: string;
    event: {
      title: string;
    };
  };
}

// イベントごとのチケット種類を取得
export const fetchTicketTypes = async (eventId: number): Promise<TicketType[]> => {
  const response = await api.get(`/events/${eventId}/ticket-types`);
  return response.data;
};

// チケット購入実行
export const purchaseTicket = async (ticketTypeId: number): Promise<PurchaseResponse> => {
  const response = await api.post('/tickets/purchase', { ticket_type_id: ticketTypeId });
  return response.data;
};