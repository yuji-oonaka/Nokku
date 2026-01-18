import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { EventChatRoom } from './types';
import { CreateRoomModal } from './components/CreateRoomModal';
// ★ useEventChatApi が未実装の場合は、api.post を直接呼ぶ形に修正も可能です
import { useEventChatApi } from './hooks/useEventChatApi';

// 固定ルーム定義
const SYSTEM_ROOMS = [
  {
    id: 'general',
    name: '🙌 雑談・自己紹介',
    description: '自由に挨拶や雑談をどうぞ',
    isSystem: true,
  },
  {
    id: 'goods',
    name: '🛍️ グッズ交換・売買',
    description: '会場での取引や事前相談に',
    isSystem: true,
  },
  {
    id: 'setlist',
    name: '🎼 セトリ予想・感想',
    description: 'ネタバレ注意！ライブの話',
    isSystem: true,
  },
];

export const EventChatLobbyScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eventId, eventTitle } = route.params;

  // ★ ポイント更新用
  const { user, refreshUser } = useAuth();

  // ★ APIフック
  const { consumeForRoomCreate, isConsuming } = useEventChatApi();

  const [dbRooms, setDbRooms] = useState<EventChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Firestore監視
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('event_chat_rooms')
      .where('eventId', '==', String(eventId))
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const fetchedRooms = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isSystem: false,
          })) as unknown as EventChatRoom[];
          setDbRooms(fetchedRooms);
          setLoading(false);
        },
        error => {
          console.error('Lobby snapshot error:', error);
          setLoading(false);
        },
      );
    return () => unsubscribe();
  }, [eventId]);

  // ★ ルーム作成処理（ポイント消費 + Firestore作成）
  const handleCreateRoom = async (roomName: string) => {
    if (!user) return;

    try {
      // 1. ポイント消費 API コール (50pt)
      // バックエンド: EventChatController@consumeRoomCreate
      await consumeForRoomCreate(String(eventId));

      // 2. Firestoreにルーム作成
      await firestore()
        .collection('event_chat_rooms')
        .add({
          eventId: String(eventId),
          name: roomName.trim(),
          createdBy: String(user.id),
          status: 'open',
          createdAt: firestore.FieldValue.serverTimestamp(),
          participantCount: 0,
        });

      // 3. 成功後の処理
      await refreshUser(); // ポイント表示を更新
      setModalVisible(false);

      Alert.alert('完了', '新しいルームを作成しました！');
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 402) {
        Alert.alert('ポイント不足', 'ルーム作成に必要なポイントが足りません。');
      } else {
        Alert.alert('エラー', 'ルーム作成に失敗しました。');
      }
    }
  };

  // ルーム参加処理
  const handleJoinRoom = (room: any) => {
    const targetRoomId = room.isSystem
      ? `event_${eventId}_${room.id}`
      : room.id;

    navigation.navigate('EventChat', {
      eventId: String(eventId),
      roomId: targetRoomId,
      roomName: room.name,
    });
  };

  const displayData = [...SYSTEM_ROOMS, ...dbRooms];

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.threadItem}
      onPress={() => handleJoinRoom(item)}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{item.isSystem ? '📢' : '💬'}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.threadTitle}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.threadDesc}>{item.description}</Text>
        ) : (
          <Text style={styles.threadMeta}>ユーザー作成ルーム</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

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
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: '#888', marginTop: 20 }}>
                ルームがありません
              </Text>
            </View>
          }
        />
      )}

      {/* FABボタン */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ★ 分離したモーダル */}
      <CreateRoomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateRoom}
        isLoading={isConsuming}
        currentPoints={user?.points || 0} // ポイント残高を渡す
      />
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
  listContent: { paddingBottom: 80, paddingTop: 10, paddingHorizontal: 15 },
  threadItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: { fontSize: 20 },
  textContainer: { flex: 1 },
  threadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  threadDesc: { fontSize: 12, color: '#AAA' },
  threadMeta: { fontSize: 12, color: '#666' },
  arrow: { fontSize: 24, color: '#666', marginLeft: 10 },
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
});
