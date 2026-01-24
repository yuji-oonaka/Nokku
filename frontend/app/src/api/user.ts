import api from '../services/api';

export type UserItem = {
  id: number;
  name: string;
  image_url: string;
  description: string;
  rarity: 'N' | 'R' | 'SR' | 'SSR' | 'UR';
  pivot: {
    obtained_at: string;
  };
};

// 持ち物一覧を取得するAPI
export const fetchUserItems = async (): Promise<UserItem[]> => {
  const response = await api.get('/user/items');
  return response.data.items;
};