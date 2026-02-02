export interface SubscriptionPlan {
  id: number;              // DBの連番ID
  plan_id: string;         // 'entry', 'standard' など
  rank: number;            // プランの強さ（1: entry, 2: standard, 3: royal）
  name: string;            // 表示名
  price_yen: number;       // 数値の金額（例: 500）
  monthly_points: number;  // 数値の付与ポイント（例: 2000）
  description: string;     // プラン説明文
  stripe_price_id: string; // Stripe側の価格ID
  color_code: string;      // UIのカラーコード
  is_recommended: boolean; // おすすめフラグ
}