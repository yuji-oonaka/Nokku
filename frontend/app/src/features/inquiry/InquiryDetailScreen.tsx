import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Button,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchInquiryById, Inquiry, closeInquiry } from '../../api/queries';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';
import api from '../../services/api';

type InquiryDetailRouteProp = RouteProp<MyPageStackParamList, 'InquiryDetail'>;

const InquiryDetailScreen = () => {
  const route = useRoute<InquiryDetailRouteProp>();
  const navigation = useNavigation();
  const { inquiryId } = route.params || {};

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!inquiryId) return;
      try {
        const data = await fetchInquiryById(inquiryId);
        setInquiry(data);
      } catch (error) {
        Alert.alert('エラー', '詳細データの取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [inquiryId]);

  const canEscalate = () => {
    if (!inquiry) return false;
    if (inquiry.status === 'closed') return false;
    if (inquiry.is_escalated) return false;

    const created = new Date(inquiry.created_at);
    const now = new Date();
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    return diffHours >= 72;
  };

  const handleEscalate = async () => {
    Alert.alert(
      '運営に相談する',
      '主催者からの回答がない、または対応に納得がいかない場合、運営が介入して調査を行います。\n\n運営にエスカレーションしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '相談する',
          style: 'destructive',
          onPress: async () => {
            setEscalating(true);
            try {
              await api.post(`/inquiries/${inquiryId}/escalate`);
              Alert.alert(
                '受付完了',
                '運営に報告されました。確認までお待ちください。',
              );
              const updated = await fetchInquiryById(inquiryId);
              setInquiry(updated);
            } catch (error) {
              Alert.alert('エラー', '送信に失敗しました。');
            } finally {
              setEscalating(false);
            }
          },
        },
      ],
    );
  };

  const handleClose = () => {
    Alert.alert(
      '解決済みにする',
      'このお問い合わせを終了しますか？\n終了すると、これ以上メッセージを送ることはできません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '終了する',
          onPress: async () => {
            if (!inquiryId) return;
            try {
              await closeInquiry(inquiryId);
              Alert.alert('完了', 'お問い合わせを解決済みにしました。');
              const updated = await fetchInquiryById(inquiryId);
              setInquiry(updated);
            } catch (error) {
              Alert.alert('エラー', '操作に失敗しました。');
            }
          },
        },
      ],
    );
  };

  const renderTargetInfo = () => {
    if (!inquiry?.target_type || !inquiry.target) return null;

    const type = inquiry.target_type;
    const target = inquiry.target;

    let label = '対象';
    let value = '';

    if (type.includes('Event') || type === 'event') {
      label = '対象イベント';
      value = target.title || '不明なイベント';
    } else if (type.includes('Order') || type === 'order') {
      label = '対象注文';
      const itemName =
        target.items && target.items.length > 0
          ? target.items[0].product_name
          : '商品情報なし';
      value = `注文 #${target.id} (${itemName})`;
    } else if (type.includes('User') || type === 'user') {
      label = '対象主催者';
      value = target.nickname || '不明なユーザー';
    } else {
      return null;
    }

    return (
      <View style={styles.targetInfo}>
        <Text style={styles.targetLabel}>{label}:</Text>
        <Text style={styles.targetValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  if (!inquiry) return null;

  // ★修正箇所: ステータスに応じたスタイルをここで確定させる
  let badgeStyle = styles.badge_open;
  if (inquiry.status === 'in_review') {
    badgeStyle = styles.badge_in_review;
  } else if (inquiry.status === 'closed') {
    badgeStyle = styles.badge_closed;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.statusRow}>
            {/* 修正: 確定させた badgeStyle を適用 */}
            <View style={[styles.badge, badgeStyle]}>
              <Text style={styles.badgeText}>
                {inquiry.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.date}>
              {new Date(inquiry.created_at).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.title}>{inquiry.subject}</Text>
        </View>

        {renderTargetInfo()}

        <View style={styles.messageBox}>
          <Text style={styles.messageLabel}>お問い合わせ内容</Text>
          <Text style={styles.messageText}>{inquiry.message}</Text>
        </View>

        {inquiry.is_escalated && (
          <View style={styles.escalatedBox}>
            <Text style={styles.escalatedTitle}>⚠️ 運営対応中</Text>
            <Text style={styles.escalatedDesc}>
              この件は運営スタッフが確認しています。{'\n'}
              {inquiry.escalation_reason &&
                `理由: ${inquiry.escalation_reason}`}
            </Text>
          </View>
        )}

        {inquiry.status !== 'closed' && (
          <View style={styles.actionContainer}>
            <Button
              title="✅ 解決したので終了する"
              onPress={handleClose}
              color="#30D158"
            />

            {!inquiry.is_escalated && canEscalate() && (
              <View style={styles.escalateWrapper}>
                <Text style={styles.actionHint}>
                  返信がなくお困りの場合は運営にご相談ください
                </Text>
                <Button
                  title={
                    escalating
                      ? '送信中...'
                      : '運営に相談する (エスカレーション)'
                  }
                  color="#FF3B30"
                  onPress={handleEscalate}
                  disabled={escalating}
                />
              </View>
            )}
          </View>
        )}

        {inquiry.status === 'closed' && (
          <View style={styles.closedMessage}>
            <Text style={styles.closedText}>
              このお問い合わせは解決済みです
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  // 以下は ViewStyle として認識されます
  badge_open: { borderColor: '#0A84FF' },
  badge_in_review: { borderColor: '#FF9F0A' },
  badge_closed: { borderColor: '#30D158' },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    color: '#8E8E93',
    fontSize: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  targetInfo: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  targetLabel: {
    color: '#8E8E93',
    marginRight: 10,
    fontWeight: 'bold',
  },
  targetValue: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    flex: 1,
  },
  messageBox: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    borderRadius: 8,
    minHeight: 150,
    marginBottom: 20,
  },
  messageLabel: {
    color: '#8E8E93',
    marginBottom: 10,
    fontSize: 14,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  escalatedBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
    borderWidth: 1,
    padding: 15,
    borderRadius: 8,
  },
  escalatedTitle: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  escalatedDesc: {
    color: '#FF3B30',
    fontSize: 14,
  },
  actionContainer: {
    marginTop: 20,
    gap: 20,
  },
  escalateWrapper: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 20,
    alignItems: 'center',
  },
  actionHint: {
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 12,
  },
  closedMessage: {
    marginTop: 30,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  closedText: {
    color: '#30D158',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default InquiryDetailScreen;
