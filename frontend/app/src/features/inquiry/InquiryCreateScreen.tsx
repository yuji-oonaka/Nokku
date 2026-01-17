import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createInquiry,
  InquiryInput,
  fetchMyTickets,
  UserTicket,
  fetchMyOrders, // ★追加
  Order, // ★追加
} from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';
import { StackNavigationProp } from '@react-navigation/stack';

// ナビゲーション型定義
type NavigationProp = StackNavigationProp<MyPageStackParamList>;
type RouteProps = RouteProp<MyPageStackParamList, 'InquiryCreate'>;

const InquiryCreateScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  // パラメータ取得 (マイページからの場合は undefined)
  const {
    target_type: initialTargetType,
    target_id,
    target_name,
    default_subject,
  } = route.params || {};

  const [subject, setSubject] = useState(default_subject || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 種別管理
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialTargetType === 'event'
      ? 'イベントについて'
      : initialTargetType === 'user'
      ? '主催者について'
      : initialTargetType === 'app'
      ? 'アプリの不具合・ご意見'
      : null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  // ★ 選択用データ管理
  const [myTickets, setMyTickets] = useState<UserTicket[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]); // ★注文用
  const [fetchingOptions, setFetchingOptions] = useState(false);

  // 選択された対象IDと表示名
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(
    target_id || null,
  );
  const [selectedTargetName, setSelectedTargetName] = useState<string | null>(
    target_name || null,
  );

  // ★ カテゴリ変更時のデータ取得
  useEffect(() => {
    // 既にパラメータ指定で来ている場合は何もしない
    if (initialTargetType) return;

    if (selectedCategory === 'イベント・チケットについて') {
      fetchTicketsForSelection();
    } else if (selectedCategory === 'グッズ・注文について') {
      // ★追加
      fetchOrdersForSelection();
    } else {
      // それ以外ならターゲットをリセット (運営宛)
      setSelectedTargetId(null);
      setSelectedTargetName(null);
    }
  }, [selectedCategory]);

  // チケット一覧を取得
  const fetchTicketsForSelection = async () => {
    setFetchingOptions(true);
    try {
      const tickets = await fetchMyTickets();
      setMyTickets(tickets);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingOptions(false);
    }
  };

  // ★ 注文一覧を取得
  const fetchOrdersForSelection = async () => {
    setFetchingOptions(true);
    try {
      const orders = await fetchMyOrders();
      setMyOrders(orders);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingOptions(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('エラー', 'お問い合わせ種別を選択してください。');
      return;
    }

    // ★ 未選択チェック
    if (
      selectedCategory === 'イベント・チケットについて' &&
      !selectedTargetId &&
      !initialTargetType
    ) {
      Alert.alert('確認', 'お問い合わせ対象のイベントを選択してください。');
      return;
    }
    if (
      selectedCategory === 'グッズ・注文について' &&
      !selectedTargetId &&
      !initialTargetType
    ) {
      Alert.alert('確認', 'お問い合わせ対象の注文を選択してください。');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      Alert.alert('エラー', '件名と本文を入力してください。');
      return;
    }

    setLoading(true);
    try {
      // ターゲットタイプ決定ロジック
      let typeToSend: 'app' | 'event' | 'user' | 'order' = 'app';

      if (initialTargetType) {
        typeToSend = initialTargetType;
      } else if (selectedCategory === 'イベント・チケットについて') {
        typeToSend = 'event';
      } else if (selectedCategory === 'グッズ・注文について') {
        typeToSend = 'order'; // ★ orderを指定
      } else if (selectedCategory === '主催者について') {
        typeToSend = 'user';
      }

      const payload: InquiryInput = {
        subject: `[${selectedCategory}] ${subject}`,
        message,
        target_type: typeToSend, // 'app' | 'event' | 'user' | 'order'
        target_id: selectedTargetId,
      };

      await createInquiry(payload);

      Alert.alert('送信完了', 'お問い合わせを受け付けました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('問い合わせ送信エラー:', error);
      Alert.alert(
        'エラー',
        '送信に失敗しました。時間をおいて再度お試しください。',
      );
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'アプリの不具合・ご意見',
    'イベント・チケットについて',
    'グッズ・注文について', // ★追加
    'アカウント・ログイン',
    '決済・支払い',
  ];

  // イベント選択リスト
  const renderTicketSelector = () => {
    if (fetchingOptions) return <ActivityIndicator color="#0A84FF" />;

    if (myTickets.length === 0) {
      return (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            購入済みのチケットが見つかりません。
          </Text>
          <Text style={styles.warningSubText}>
            購入前のイベントに関するご質問は、各イベントページの「主催者に問い合わせる」からご連絡ください。
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.subLabel}>
          どのイベントについてのお問い合わせですか？
        </Text>
        {myTickets.map(ticket => (
          <TouchableOpacity
            key={ticket.id}
            style={[
              styles.optionItem,
              // queries.ts の UserTicket 定義に合わせて event.title などを参照
              selectedTargetId === (ticket.event as any).id &&
                styles.optionItemSelected,
            ]}
            onPress={() => {
              // @ts-ignore
              setSelectedTargetId(ticket.event.id);
              setSelectedTargetName(ticket.event.title);
            }}
          >
            <Text style={styles.optionText} numberOfLines={1}>
              {ticket.event.title} (
              {new Date(ticket.event.event_date).toLocaleDateString()})
            </Text>
            {selectedTargetId === (ticket.event as any).id && (
              <Text style={styles.checkMark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ★ 注文選択リスト
  const renderOrderSelector = () => {
    if (fetchingOptions) return <ActivityIndicator color="#0A84FF" />;

    if (myOrders.length === 0) {
      return (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>購入履歴が見つかりません。</Text>
          <Text style={styles.warningSubText}>
            購入前のグッズに関するご質問は、各商品ページからご確認ください。
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.subLabel}>
          どの注文についてのお問い合わせですか？
        </Text>
        {myOrders.map(order => {
          // 商品名の概要を作成
          const summary =
            order.items.length > 0
              ? order.items[0].product_name +
                (order.items.length > 1 ? ` 他${order.items.length - 1}点` : '')
              : '商品情報なし';

          return (
            <TouchableOpacity
              key={order.id}
              style={[
                styles.optionItem,
                selectedTargetId === order.id && styles.optionItemSelected,
              ]}
              onPress={() => {
                setSelectedTargetId(order.id);
                setSelectedTargetName(`注文 #${order.id} (${summary})`);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText} numberOfLines={1}>
                  注文 #{order.id} -{' '}
                  {new Date(order.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.optionSubText} numberOfLines={1}>
                  {summary}
                </Text>
              </View>
              {selectedTargetId === order.id && (
                <Text style={styles.checkMark}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={styles.headerTitle}>お問い合わせ作成</Text>

            {/* 1. 宛先/種別選択エリア */}
            <Text style={styles.label}>お問い合わせ種別</Text>
            {initialTargetType ? (
              // 特定ページから来た場合は固定表示
              <View style={[styles.input, styles.readOnly]}>
                <Text style={styles.readOnlyText}>
                  {initialTargetType === 'event'
                    ? 'イベント主催者への連絡'
                    : initialTargetType === 'order'
                    ? '販売者への連絡'
                    : '運営への連絡'}
                  {target_name && ` (${target_name})`}
                </Text>
              </View>
            ) : (
              // 総合窓口の場合はプルダウン（モーダル）
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalVisible(true)}
              >
                <Text
                  style={
                    selectedCategory
                      ? styles.selectorText
                      : styles.placeholderText
                  }
                >
                  {selectedCategory || '選択してください'}
                </Text>
                <Text style={styles.selectorArrow}>▼</Text>
              </TouchableOpacity>
            )}

            {/* 2. ドリルダウンエリア (イベント) */}
            {!initialTargetType &&
            selectedCategory === 'イベント・チケットについて' ? (
              <View style={styles.selectionArea}>{renderTicketSelector()}</View>
            ) : null}

            {/* ★ 3. ドリルダウンエリア (注文) */}
            {!initialTargetType &&
            selectedCategory === 'グッズ・注文について' ? (
              <View style={styles.selectionArea}>{renderOrderSelector()}</View>
            ) : null}

            {/* 4. 入力フォーム */}
            {/* ターゲットが決まったら、または汎用問い合わせなら表示 */}
            {((selectedCategory !== 'イベント・チケットについて' &&
              selectedCategory !== 'グッズ・注文について') ||
              selectedTargetId ||
              initialTargetType) && (
              <>
                <Text style={styles.label}>件名</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="件名を入力"
                  placeholderTextColor="#888"
                />

                <Text style={styles.label}>お問い合わせ内容</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="詳細をご記入ください..."
                  placeholderTextColor="#888"
                  multiline
                  textAlignVertical="top"
                />

                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color="#0A84FF"
                    style={styles.buttonSpacing}
                  />
                ) : (
                  <View style={styles.buttonSpacing}>
                    <Button title="送信する" onPress={handleSubmit} />
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* 種別選択モーダル */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>種別を選択</Text>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{cat}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#CCCCCC',
  },
  input: {
    backgroundColor: '#333333',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  readOnly: {
    backgroundColor: '#252525',
    justifyContent: 'center',
  },
  readOnlyText: {
    color: '#AAAAAA',
  },
  textarea: {
    minHeight: 150,
  },
  buttonSpacing: {
    marginTop: 10,
  },
  // セレクター
  selector: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
  },
  selectorArrow: {
    color: '#888',
    fontSize: 12,
  },
  // ドリルダウンエリア
  selectionArea: {
    marginBottom: 20,
    backgroundColor: '#252525',
    padding: 10,
    borderRadius: 8,
  },
  subLabel: {
    color: '#FFFFFF',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  optionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // チェックマークの位置合わせ
  },
  optionItemSelected: {
    backgroundColor: '#0A84FF',
    borderRadius: 4,
  },
  optionText: {
    color: '#FFFFFF',
    flex: 1,
    fontWeight: 'bold',
  },
  optionSubText: {
    // ★追加
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 2,
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  warningBox: {
    padding: 10,
    backgroundColor: '#332a00',
    borderRadius: 4,
  },
  warningText: {
    color: '#FFCC00',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningSubText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  modalCancel: {
    marginTop: 15,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default InquiryCreateScreen;
