import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import {
  createCheckoutSession,
  createPortalSession,
  renewSubscription,
  upgradeSubscription,
  getSubscriptionStatus,
} from '../../api/subscription';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from './subscriptionData';

const SubscriptionScreen = () => {
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [currentPriceId, setCurrentPriceId] = useState<string | null>(null);
  const [currentRank, setCurrentRank] = useState<number>(0); // 現在のランク(未加入=0)
  const [nextPaymentDate, setNextPaymentDate] = useState<string>('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await getSubscriptionStatus();
      if (data.status === 'active') {
        setCurrentPriceId(data.price_id);
        setNextPaymentDate(data.current_period_end); // 次回更新日

        // 現在のランクを特定して保存
        const currentPlan = SUBSCRIPTION_PLANS.find(
          p => p.priceId === data.price_id,
        );
        setCurrentRank(currentPlan ? currentPlan.rank : 0);
      } else {
        setCurrentPriceId(null);
        setCurrentRank(0);
      }
    } catch (e) {
      console.log('Status fetch error', e);
    }
  };

  const handleAction = async (plan: SubscriptionPlan) => {
    setProcessingPlanId(plan.id);
    try {
      // ---------------------------------------------------
      // パターンA: 新規契約 (未加入)
      // ---------------------------------------------------
      if (!currentPriceId) {
        const url = await createCheckoutSession(plan.priceId);
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        return;
      }

      // ---------------------------------------------------
      // パターンB: 同プラン更新 (おかわり)
      // ---------------------------------------------------
      if (plan.priceId === currentPriceId) {
        Alert.alert(
          'ポイント補充（即時更新）',
          `今のプランを更新して、すぐに${plan.points}を受け取りますか？\n\n・${plan.price}が即時決済されます\n・次回更新日は今日から1ヶ月後に変わります`,
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

      // ---------------------------------------------------
      // パターンC: アップグレード (上位へ)
      // ---------------------------------------------------
      if (plan.rank > currentRank) {
        Alert.alert(
          'プランのアップグレード',
          `【重要】すぐにVIP特典が有効になります。\n\n・${plan.price}が即時決済されます\n・ポイント(${plan.points})も即時付与されます\n・これまでのプラン料金の日割り返金はありません`,
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => setProcessingPlanId(null),
            },
            {
              text: '今すぐアップグレード',
              onPress: async () => {
                await upgradeSubscription(plan.priceId);
                Alert.alert(
                  'おめでとうございます！',
                  'プラン変更が完了しました。VIP特典をお楽しみください！',
                );
                fetchStatus();
              },
            },
          ],
        );
        return;
      }

      // ---------------------------------------------------
      // パターンD: ダウングレード (下位へ) -> ポータルへ
      // ---------------------------------------------------
      if (plan.rank < currentRank) {
        Alert.alert(
          'プランの変更（ダウン）',
          '安いプランへの変更は、Web管理画面から行います。\n変更は「来月から」適用されます。',
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
      Alert.alert(
        'エラー',
        '処理に失敗しました。時間をおいて再度お試しください。',
      );
    } finally {
      setProcessingPlanId(null);
    }
  };

  // ボタンの文言決定ロジック
  const getButtonLabel = (plan: SubscriptionPlan) => {
    if (!currentPriceId) return '申し込む';
    if (plan.priceId === currentPriceId) return '今すぐ更新 (ポイント補充)';
    if (plan.rank > currentRank) return '今すぐアップグレード';
    return 'プラン変更 (Webへ)';
  };

  // ボタンのスタイル決定 (色を変えるなど視覚的な誘導)
  const getButtonStyle = (plan: SubscriptionPlan) => {
    if (!currentPriceId) return { backgroundColor: plan.color };
    if (plan.priceId === currentPriceId)
      return {
        backgroundColor: '#333',
        borderColor: plan.color,
        borderWidth: 1,
      }; // 更新は少し落ち着いた色
    if (plan.rank > currentRank) return { backgroundColor: '#E0245E' }; // アップグレードは目立つ色
    return { backgroundColor: '#999' }; // ダウングレードは地味な色
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>プラン選択</Text>

      {/* 契約中なら次回更新日を表示してあげる */}
      {nextPaymentDate && (
        <Text style={styles.statusText}>次回更新日: {nextPaymentDate}</Text>
      )}

      {SUBSCRIPTION_PLANS.map(plan => {
        const isProcessing = processingPlanId !== null;
        const isLoading = processingPlanId === plan.id;

        return (
          <View
            key={plan.id}
            style={[styles.card, plan.recommended && styles.recommendedCard]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.planName, { color: plan.color }]}>
                {plan.name}
              </Text>
              <Text style={styles.planPoints}>{plan.points}</Text>
            </View>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Text style={styles.planDesc}>{plan.description}</Text>

            <TouchableOpacity
              style={[
                styles.button,
                getButtonStyle(plan),
                isProcessing && !isLoading && { opacity: 0.5 },
              ]}
              onPress={() => handleAction(plan)}
              disabled={isProcessing}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{getButtonLabel(plan)}</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.portalButton}
          onPress={async () => {
            const url = await createPortalSession();
            Linking.openURL(url);
          }}
        >
          <Text style={styles.portalButtonText}>
            契約内容の確認・解約はこちら
          </Text>
        </TouchableOpacity>
        <Text style={styles.note}>
          ※ 決済はStripeの安全なページで行われます。
        </Text>
      </View>
    </ScrollView>
  );
};

// スタイル (変更分のみ抜粋、他は以前と同じ)
const styles = StyleSheet.create({
  // ... existing styles ...
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
  footer: { marginTop: 20 },
  portalButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  portalButtonText: { color: '#666', fontWeight: 'bold' },
  note: { fontSize: 12, color: '#999', textAlign: 'center' },
});

export default SubscriptionScreen;