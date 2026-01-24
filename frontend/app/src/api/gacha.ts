import api from '../services/api';

// --- 型定義 (Types) ---

// 基本的なアイテム情報
export interface ProfileItem {
  id: number;
  name: string;
  image_url: string;
  rarity: 'N' | 'R' | 'SR';
  is_pickup?: boolean;
}

// ガチャ詳細に含まれるアイテム情報
export interface GachaItem {
  id: number;
  name: string;
  image_url: string;
  rarity: 'N' | 'R' | 'SR';
  is_pickup: boolean;
  probability_weight: number;
}

// ガチャ筐体情報
export interface Gacha {
  id: number;
  name: string;
  description: string;
  consumption_point: number;
  end_at: string | null;
  items?: GachaItem[]; // 詳細取得時のみ backend から返ってくる
}

// ガチャ実行結果
export interface GachaResult {
  user_id: number;
  item: ProfileItem;
  is_duplicate: boolean;
  refund_amount: number;
  remaining_points: number;
}

// APIレスポンス全体
export interface SpinResponse {
  message: string;
  result: GachaResult;
}

// --- API関数 (Functions) ---

// 開催中のガチャ一覧を取得
export const fetchGachas = async (): Promise<Gacha[]> => {
  const response = await api.get<Gacha[]>('/gachas');
  return response.data;
};

// ガチャの詳細を取得
export const fetchGachaDetail = async (id: number): Promise<Gacha> => {
  const response = await api.get<Gacha>(`/gachas/${id}`);
  return response.data;
};

// ガチャを回す
export const spinGacha = async (gachaId: number): Promise<SpinResponse> => {
  const response = await api.post<SpinResponse>(`/gachas/${gachaId}/spin`);
  return response.data;
};