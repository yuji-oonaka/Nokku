export interface SubscriptionPlan {
  id: string;
  rank: number; // ★追加: プランの強さ
  name: string;
  price: string;
  points: string;
  description: string;
  priceId: string;
  color: string;
  recommended?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'entry',
    rank: 1, // ★ 1番弱い
    name: '🥉 お試し応援プラン',
    price: '100円 / 月',
    points: '300 pt',
    description: 'ちょっとだけ足したい方向け。\nログボと合わせて月500pt以上！',
    priceId: 'price_1SrtKaLcIj5T4QhVZAb8tPlW',
    color: '#CD7F32',
  },
  {
    id: 'standard',
    rank: 2, // ★ 真ん中
    name: '🥈 スタンダードプラン',
    price: '500円 / 月',
    points: '2,000 pt',
    description: '【人気No.1】コミュニティの主力へ。\n毎日チャットを楽しみたい方に。',
    priceId: 'price_1SrtIwLcIj5T4QhVzPiQehvg',
    color: '#C0C0C0',
    recommended: true,
  },
  {
    id: 'royal',
    rank: 3, // ★ 最強
    name: '🥇 VIPプラン',
    price: '2,000円 / 月',
    points: '10,000 pt',
    description: '圧倒的コスパ。ガチャも会話も\n思う存分楽しみたい王様へ。',
    priceId: 'price_1SrtLZLcIj5T4QhV3Gxj32wH',
    color: '#FFD700',
  },
];