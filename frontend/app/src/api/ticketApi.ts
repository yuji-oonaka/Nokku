import api from '../services/api';

export interface TicketType {
  id: number;
  event_id: number;
  name: string;
  price: number;
  capacity: number;
  remaining: number;
  seating_type: 'random' | 'free';
}

export interface PurchaseResponse {
  message: string;
  tickets: any[]; // 複数枚対応のため配列に変更
}

// イベントごとのチケット種類を取得
export const fetchTicketTypes = async (eventId: number): Promise<TicketType[]> => {
  const response = await api.get(`/events/${eventId}/ticket-types`);
  return response.data;
};

// ★ 追加: 決済準備 (PaymentIntent作成)
// Backendの PaymentController にリクエストを送ります
export const createTicketPaymentIntent = async (ticketTypeId: number, quantity: number) => {
  const response = await api.post('/create-ticket-payment-intent', {
    ticket_type_id: ticketTypeId,
    quantity: quantity,
  });
  return response.data;
};

// ★ 修正: 購入実行
// 引数を「数値(ID)だけ」から「オブジェクト(ID, 枚数, 決済ID)」に変更します
export const purchaseTicket = async (data: { 
  ticket_type_id: number; 
  quantity: number; 
  payment_intent_id: string 
}): Promise<PurchaseResponse> => {
  const response = await api.post('/tickets/purchase', data);
  return response.data;
};