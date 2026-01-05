import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { EventStackParamList } from '../../navigators/EventStackNavigator';

type ChatLobbyRouteProp = RouteProp<EventStackParamList, 'ChatLobby'>;
type ChatLobbyNavigationProp = StackNavigationProp<
  EventStackParamList,
  'ChatLobby'
>;

// スレッドデータの型 (固定・動的共通)
interface ChatThread {
  id: string;
  title: string;
  description?: string; // 固定スレッド用の説明文
  isSystem?: boolean; // 固定スレッドかどうかのフラグ
  createdAt?: FirebaseFirestoreTypes.Timestamp;
  createdBy?: {
    id: number;
    nickname: string;
  };
}

// ★ 固定スレッドの定義 (System Threads)
const SYSTEM_THREADS: ChatThread[] = [
  {
    id: 'general',
    title: '🙌 雑談・自己紹介',
    description: '自由に挨拶や雑談をどうぞ',
    isSystem: true,
  },
  {
    id: 'goods',
    title: '🛍️ グッズ交換・売買',
    description: '会場での取引や事前相談に',
    isSystem: true,
  },
  {
    id: 'setlist',
    title: '🎼 セトリ予想・感想',
    description: 'ネタバレ注意！ライブの話',
    isSystem: true,
  },
];

const ChatLobbyScreen: React.FC = () => {
  const navigation = useNavigation<ChatLobbyNavigationProp>();
  const route = useRoute<ChatLobbyRouteProp>();
  const { eventId, eventTitle } = route.params;
  const { user } = useAuth();

  const [userThreads, setUserThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  // モーダル用
  const [modalVisible, setModalVisible] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Firestore参照
  const threadsRef = firestore()
    .collection('event_chats')
    .doc(`event_${eventId}`)
    .collection('threads');

  // 1. ユーザー作成スレッドのリアルタイム取得
  useEffect(() => {
    const subscriber = threadsRef.orderBy('createdAt', 'desc').onSnapshot(
      querySnapshot => {
        const fetchedThreads: ChatThread[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          fetchedThreads.push({
            id: doc.id,
            title: data.title,
            // ユーザー作成スレッドには description は無い想定 (あれば追加可)
            createdAt: data.createdAt,
            createdBy: data.createdBy,
            isSystem: false,
          });
        });
        setUserThreads(fetchedThreads);
        setLoading(false);
      },
      error => {
        console.error('スレッド取得エラー:', error);
        setLoading(false);
      },
    );

    return () => subscriber();
  }, [eventId]);

  // 2. スレッド作成
  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) {
      Alert.alert('エラー', 'スレッドのタイトルを入力してください');
      return;
    }
    if (!user) return;

    setCreating(true);
    try {
      await threadsRef.add({
        title: newThreadTitle.trim(),
        createdAt: firestore.Timestamp.now(),
        createdBy: {
          id: user.id,
          nickname: user.nickname,
        },
      });
      setModalVisible(false);
      setNewThreadTitle('');
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'スレッドの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleThreadPress = (thread: ChatThread) => {
    navigation.navigate('Chat', {
      eventId: eventId,
      eventTitle: eventTitle, // ★ (FIX) ここを追加しました
      threadId: thread.id,
      threadTitle: thread.title,
    });
  };

  // 日付フォーマット
  const formatDate = (timestamp?: FirebaseFirestoreTypes.Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  // リストアイテム描画
  const renderItem = ({ item }: { item: ChatThread }) => {
    if (item.isSystem) {
      // ★ 固定スレッドのスタイル
      return (
        <TouchableOpacity
          style={[styles.threadItem, styles.systemThreadItem]}
          onPress={() => handleThreadPress(item)}
        >
          <View style={styles.threadIconSystem}>
            <Text style={styles.threadIconTextSystem}>📌</Text>
          </View>
          <View style={styles.threadInfo}>
            <Text style={styles.threadTitleSystem}>{item.title}</Text>
            <Text style={styles.threadDescription}>{item.description}</Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      // ★ ユーザー作成スレッドのスタイル
      return (
        <TouchableOpacity
          style={styles.threadItem}
          onPress={() => handleThreadPress(item)}
        >
          <View style={styles.threadIcon}>
            <Text style={styles.threadIconText}>#</Text>
          </View>
          <View style={styles.threadInfo}>
            <Text style={styles.threadTitle}>{item.title}</Text>
            <Text style={styles.threadMeta} numberOfLines={1}>
              作成: {item.createdBy?.nickname}
            </Text>
          </View>
          <View style={styles.threadRight}>
            <Text style={styles.threadDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  // 表示データ統合: 固定スレッド + ユーザー作成スレッド
  const displayData = [...SYSTEM_THREADS, ...userThreads];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{eventTitle}</Text>
        <Text style={styles.headerSubtitle}>トピックを選んで会話に参加</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* スレッド作成ボタン (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 作成モーダル */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>新しい話題を作成</Text>
                <TextInput
                  style={styles.input}
                  placeholder="タイトル (例: 終演後のオフ会)"
                  placeholderTextColor="#888"
                  value={newThreadTitle}
                  onChangeText={setNewThreadTitle}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.createButton]}
                    onPress={handleCreateThread}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.createButtonText}>作成</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#1C1C1E',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },

  listContent: { paddingBottom: 80, paddingTop: 10 },

  // 共通アイテムスタイル
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#111', // デフォルト背景
  },

  // 固定スレッド用スタイル (少し目立たせる)
  systemThreadItem: {
    backgroundColor: '#1C1C1E', // 明るめ
    borderLeftWidth: 4,
    borderLeftColor: '#0A84FF', // 青いバー
  },
  threadIconSystem: { marginRight: 12 },
  threadIconTextSystem: { fontSize: 20 },
  threadTitleSystem: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },

  // ユーザー作成スレッド用スタイル
  threadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threadIconText: { fontSize: 16, color: '#888', fontWeight: 'bold' },

  // 共通テキスト
  threadInfo: { flex: 1 },
  threadTitle: { fontSize: 16, fontWeight: 'bold', color: '#DDD' },
  threadDescription: { fontSize: 12, color: '#AAA', marginTop: 2 },
  threadMeta: { fontSize: 11, color: '#666', marginTop: 2 },

  threadRight: { alignItems: 'flex-end' },
  threadDate: { fontSize: 11, color: '#555' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { fontSize: 30, color: '#FFF', marginTop: -3 },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#333', marginRight: 10 },
  createButton: { backgroundColor: '#0A84FF', marginLeft: 10 },
  cancelButtonText: { color: '#FFF' },
  createButtonText: { color: '#FFF', fontWeight: 'bold' },
});

export default ChatLobbyScreen;
