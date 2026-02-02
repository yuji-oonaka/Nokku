import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  getSubscriptionPlans,
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
  renewSubscription,
  upgradeSubscription,
} from '../../api/subscription';
import { SubscriptionPlan } from './subscriptionData';

const SubscriptionScreen = () => {
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [currentPriceId, setCurrentPriceId] = useState<string | null>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState<string>('');

  // 1. プラン一覧をDBから取得
  const { data: plans, isLoading: isPlansLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: getSubscriptionPlans,
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await getSubscriptionStatus();
      if (data.status === 'active') {
        setCurrentPriceId(data.price_id);
        setNextPaymentDate(data.current_period_end);
      } else {
        setCurrentPriceId(null);
      }
    } catch (e) {
      console.log('Status fetch error', e);
    }
  };

  // 2. 現在のランクを動的に特定 (stripe_price_id を使用)
  const currentRank = useMemo(() => {
    if (!plans || !currentPriceId) return 0;
    const current = plans.find(p => p.stripe_price_id === currentPriceId);
    return current ? current.rank : 0;
  }, [plans, currentPriceId]);

  // 3. 表示用の整形ヘルパー
  const formatPrice = (price: number) => `¥${price.toLocaleString()} / 月`;
  const formatPoints = (points: number) => `${points.toLocaleString()} pt`;

  const handleAction = async (plan: SubscriptionPlan) => {
    setProcessingPlanId(plan.plan_id); // plan_id を使用
    try {
      if (!currentPriceId) {
        const url = await createCheckoutSession(plan.stripe_price_id);
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        return;
      }

      if (plan.stripe_price_id === currentPriceId) {
        Alert.alert(
          'ポイント補充（即時更新）',
          `今のプランを更新して、すぐに ${formatPoints(
            plan.monthly_points,
          )} を受け取りますか？`,
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => setProcessingPlanId(null),
            },
            {
              text: '更新してポイントGET',
              onPress: async () => {
                await renewSubscription();
                Alert.alert('完了', 'ポイントをチャージしました！');
                fetchStatus();
              },
            },
          ],
        );
        return;
      }

      if (plan.rank > currentRank) {
        Alert.alert(
          'プランのアップグレード',
          `・${formatPrice(
            plan.price_yen,
          )} が即時決済されます\n・${formatPoints(
            plan.monthly_points,
          )} が付与されます`,
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => setProcessingPlanId(null),
            },
            {
              text: '今すぐアップグレード',
              onPress: async () => {
                await upgradeSubscription(plan.stripe_price_id);
                Alert.alert('完了', 'アップグレードが完了しました！');
                fetchStatus();
              },
            },
          ],
        );
        return;
      }

      if (plan.rank < currentRank) {
        Alert.alert(
          'プラン変更',
          '安いプランへの変更はWeb管理画面から行います。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: 'Web管理画面へ',
              onPress: async () => {
                const url = await createPortalSession();
                await Linking.openURL(url);
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('エラー', '処理に失敗しました。');
    } finally {
      setProcessingPlanId(null);
    }
  };

  if (isPlansLoading)
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>プラン選択</Text>
      {nextPaymentDate && (
        <Text style={styles.statusText}>次回更新日: {nextPaymentDate}</Text>
      )}

      {plans?.map(plan => {
        const isCurrentPlan = plan.stripe_price_id === currentPriceId;
        const isLoading = processingPlanId === plan.plan_id;

        return (
          <View
            key={plan.plan_id}
            style={[styles.card, plan.is_recommended && styles.recommendedCard]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.planName, { color: plan.color_code }]}>
                {plan.name}
              </Text>
              <Text style={styles.planPoints}>
                {formatPoints(plan.monthly_points)}
              </Text>
            </View>
            <Text style={styles.planPrice}>{formatPrice(plan.price_yen)}</Text>
            <Text style={styles.planDesc}>{plan.description}</Text>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: isCurrentPlan ? '#333' : plan.color_code },
                processingPlanId !== null && !isLoading && { opacity: 0.5 },
              ]}
              onPress={() => handleAction(plan)}
              disabled={processingPlanId !== null}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isCurrentPlan
                    ? '今すぐ更新 (ポイント補充)'
                    : plan.rank > currentRank
                    ? 'アップグレード'
                    : '申し込む'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
};

// スタイルは以前のものを使用
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusText: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  recommendedCard: { borderColor: '#C0C0C0', borderWidth: 2 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: { fontSize: 18, fontWeight: 'bold' },
  planPoints: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  planPrice: { fontSize: 16, color: '#666', marginBottom: 15 },
  planDesc: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default SubscriptionScreen;
