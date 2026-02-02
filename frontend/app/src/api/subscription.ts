import api from '../services/api';
import { SubscriptionPlan } from '../features/subscription/subscriptionData';

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get<SubscriptionPlan[]>('/subscription/plans');
  return response.data;
};

// 既存の Checkout (新規)
export const createCheckoutSession = async (priceId: string): Promise<string> => {
  const response = await api.post<{ checkout_url: string }>('/subscription/checkout', { price_id: priceId });
  return response.data.checkout_url;
};

// 既存の Portal (管理/ダウングレード)
export const createPortalSession = async (): Promise<string> => {
  const response = await api.post<{ portal_url: string }>('/subscription/portal');
  return response.data.portal_url;
};

// ★ 追加: 同プラン更新 (おかわり)
export const renewSubscription = async (): Promise<void> => {
  await api.post('/subscription/renew');
};

// ★ 追加: 即時アップグレード
export const upgradeSubscription = async (priceId: string): Promise<void> => {
  await api.post('/subscription/upgrade', { price_id: priceId });
};

// 既存のステータス取得
export const getSubscriptionStatus = async () => {
  const response = await api.get('/subscription/status');
  return response.data;
};