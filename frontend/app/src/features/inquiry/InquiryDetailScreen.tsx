import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Button,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView, // standard SafeAreaView for layout control
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  fetchInquiryById,
  Inquiry,
  closeInquiry,
  sendInquiryMessage, // 追加
  InquiryResponse, // 追加
} from '../../api/queries';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';
import api from '../../services/api';

type InquiryDetailRouteProp = RouteProp<MyPageStackParamList, 'InquiryDetail'>;

const InquiryDetailScreen = () => {
  const route = useRoute<InquiryDetailRouteProp>();
  const navigation = useNavigation();
  const { inquiryId } = route.params || {};

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false); // 送信中のローディング
  const [inputText, setInputText] = useState('');
  const [escalating, setEscalating] = useState(false);

  // スクロール制御用
  const scrollViewRef = useRef<ScrollView>(null);

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

  useEffect(() => {
    loadData();
  }, [inquiryId]);

  // 送信ハンドラー
  const handleSend = async () => {
    if (!inputText.trim()) return;

    setSending(true);
    try {
      await sendInquiryMessage(inquiryId, inputText);
      setInputText('');
      await loadData(); // データを再取得して画面更新

      // 送信後、一番下までスクロール
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('エラー', 'メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

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
      '主催者からの回答がない場合、運営が介入して調査を行います。\n実行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '相談する',
          style: 'destructive',
          onPress: async () => {
            setEscalating(true);
            try {
              // ※運営へのエスカレーションAPIが未実装の場合はエラーになります
              // 必要に応じて実装してください: await api.post(`/inquiries/${inquiryId}/escalate`);
              Alert.alert('確認', '現在はデモ動作です。');

              // const updated = await fetchInquiryById(inquiryId);
              // setInquiry(updated);
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
      'このお問い合わせを終了しますか？\n終了すると、メッセージの送信はできなくなります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '終了する',
          onPress: async () => {
            if (!inquiryId) return;
            try {
              await closeInquiry(inquiryId);
              Alert.alert('完了', '解決済みにしました。');
              loadData();
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

    // target_typeの文字列判定（App\Models\Event 等も含む）
    if (type.toLowerCase().includes('event')) {
      label = 'イベント';
      value = target.title || '不明';
    } else if (type.toLowerCase().includes('order')) {
      label = '注文';
      value = `#${target.id}`;
    } else if (type.toLowerCase().includes('user')) {
      label = '主催者';
      value = target.nickname || '不明';
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

  // ステータスバッジのスタイル決定
  let badgeStyle = styles.badge_open;
  if (inquiry.status === 'in_review') badgeStyle = styles.badge_in_review;
  else if (inquiry.status === 'closed') badgeStyle = styles.badge_closed;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
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
          {renderTargetInfo()}
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* 1. 最初の問い合わせ（右側・自分） */}
          <View style={[styles.messageRow, styles.myMessageRow]}>
            <View style={[styles.bubble, styles.myBubble]}>
              <Text style={styles.myMessageText}>{inquiry.message}</Text>
            </View>
          </View>
          <Text style={styles.timestampRight}>
            {new Date(inquiry.created_at).toLocaleString()}
          </Text>

          {/* 2. 返信履歴のループ */}
          {inquiry.responses?.map((res: InquiryResponse) => {
            const isMe = !res.is_admin;
            return (
              <View key={res.id} style={{ marginBottom: 15 }}>
                <View
                  style={[
                    styles.messageRow,
                    isMe ? styles.myMessageRow : styles.otherMessageRow,
                  ]}
                >
                  {!isMe && (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>運</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMe ? styles.myBubble : styles.otherBubble,
                    ]}
                  >
                    <Text
                      style={
                        isMe ? styles.myMessageText : styles.otherMessageText
                      }
                    >
                      {res.body}
                    </Text>
                  </View>
                </View>
                <Text
                  style={isMe ? styles.timestampRight : styles.timestampLeft}
                >
                  {new Date(res.created_at).toLocaleString()}
                </Text>
              </View>
            );
          })}

          {/* 3. アクションボタン（最下部） */}
          {inquiry.status !== 'closed' ? (
            <View style={styles.actionArea}>
              <Button
                title="解決したので終了する"
                onPress={handleClose}
                color="#30D158"
              />

              {!inquiry.is_escalated && canEscalate() && (
                <TouchableOpacity
                  onPress={handleEscalate}
                  style={{ marginTop: 15 }}
                >
                  <Text style={{ color: '#FF3B30', textAlign: 'center' }}>
                    運営に相談する
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.closedArea}>
              <Text style={styles.closedText}>
                このお問い合わせは解決済みです
              </Text>
              {inquiry.expires_at && (
                <Text style={styles.expireText}>
                  保存期限: {new Date(inquiry.expires_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* 4. 入力エリア (解決済みでなければ表示) */}
        {inquiry.status !== 'closed' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="メッセージを入力..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              <Text style={styles.sendButtonText}>
                {sending ? '...' : '送信'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
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
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1C1C1E',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badge_open: { borderColor: '#0A84FF' },
  badge_in_review: { borderColor: '#FF9F0A' },
  badge_closed: { borderColor: '#30D158' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  date: { color: '#8E8E93', fontSize: 12 },

  targetInfo: {
    flexDirection: 'row',
    marginTop: 5,
  },
  targetLabel: { color: '#8E8E93', fontSize: 12, marginRight: 5 },
  targetValue: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  scrollContent: {
    padding: 15,
    paddingBottom: 20,
  },

  // Chat Styles
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#FFF', fontSize: 10 },

  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#0A84FF',
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#333',
    borderBottomLeftRadius: 2,
  },
  myMessageText: { color: '#FFF', fontSize: 15 },
  otherMessageText: { color: '#FFF', fontSize: 15 },

  timestampRight: {
    textAlign: 'right',
    color: '#666',
    fontSize: 10,
    marginBottom: 15,
  },
  timestampLeft: {
    textAlign: 'left',
    color: '#666',
    fontSize: 10,
    marginBottom: 15,
    marginLeft: 38, // avatar width + margin
  },

  // Footer Actions
  actionArea: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  closedArea: {
    marginTop: 30,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  closedText: { color: '#30D158', fontWeight: 'bold', fontSize: 16 },
  expireText: { color: '#666', fontSize: 12, marginTop: 5 },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1C1C1E',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    color: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default InquiryDetailScreen;
