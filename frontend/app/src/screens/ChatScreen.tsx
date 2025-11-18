import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventStackParamList } from '../navigators/EventStackNavigator';

type ChatScreenRouteProp = RouteProp<EventStackParamList, 'Chat'>;

// メッセージの型拡張
interface ChatMessage {
  id: string;
  text: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  userId: number;
  userName: string;
  // ★ 追加フィールド
  deletedAt?: FirebaseFirestoreTypes.Timestamp; // 削除日時
  replyTo?: {
    // リプライ元の情報
    id: string;
    userName: string;
    text: string;
  };
  reactions?: {
    // リアクション { userId: '❤️' }
    [userId: number]: string;
  };
}

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const { eventId, threadId } = route.params;
  const { user: authUser } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');

  // ★ リプライ状態管理
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // ★ 長押しメニュー用
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
    null,
  );
  const [menuVisible, setMenuVisible] = useState(false);

  const messagesRef = firestore()
    .collection('event_chats')
    .doc(`event_${eventId}`)
    .collection('threads')
    .doc(threadId)
    .collection('messages');

  // 1. リアルタイム購読
  useEffect(() => {
    if (!eventId) return;
    const subscriber = messagesRef.orderBy('createdAt', 'desc').onSnapshot(
      querySnapshot => {
        if (!querySnapshot) return;
        const fetchedMessages: ChatMessage[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text,
            createdAt: data.createdAt,
            userId: data.userId,
            userName: data.userName,
            deletedAt: data.deletedAt, // 追加
            replyTo: data.replyTo, // 追加
            reactions: data.reactions, // 追加
          } as ChatMessage;
        });
        setMessages(fetchedMessages);
        setLoading(false);
      },
      error => {
        console.error('Firestore error:', error);
        setLoading(false);
      },
    );
    return () => subscriber();
  }, [eventId]);

  // 2. 送信処理
  const handleSend = useCallback(() => {
    if (inputText.trim().length === 0 || !authUser) return;

    const messageData: any = {
      text: inputText.trim(),
      createdAt: firestore.Timestamp.now(),
      userId: authUser.id,
      userName: authUser.nickname,
    };

    // リプライがある場合
    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        userName: replyingTo.userName,
        text: replyingTo.text, // 元のメッセージ本文
      };
    }

    messagesRef.add(messageData);
    setInputText('');
    setReplyingTo(null); // リプライ状態リセット
  }, [inputText, authUser, messagesRef, replyingTo]);

  // 3. メッセージ削除 (論理削除)
  const handleDelete = async (messageId: string) => {
    try {
      await messagesRef.doc(messageId).update({
        deletedAt: firestore.Timestamp.now(),
      });
      Alert.alert('完了', 'メッセージを削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '削除に失敗しました');
    }
  };

  // 4. リアクション追加/削除
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!authUser) return;
    // トグル動作 (既に同じリアクションがあれば消す、なければ上書き)
    // Firestoreのマップ更新: `reactions.${userId}`
    const fieldPath = `reactions.${authUser.id}`;
    await messagesRef.doc(messageId).update({
      [fieldPath]: emoji,
    });
    setMenuVisible(false);
  };

  // 5. 長押しメニュー操作
  const onLongPressMessage = (message: ChatMessage) => {
    if (message.deletedAt) return; // 削除済みならメニュー出さない
    setSelectedMessage(message);
    setMenuVisible(true);
  };

  const handleMenuAction = (action: 'reply' | 'delete' | 'copy' | 'report') => {
    setMenuVisible(false);
    if (!selectedMessage) return;

    switch (action) {
      case 'reply':
        setReplyingTo(selectedMessage);
        break;
      case 'delete':
        Alert.alert('削除', 'このメッセージを削除しますか？', [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除する',
            style: 'destructive',
            onPress: () => handleDelete(selectedMessage.id),
          },
        ]);
        break;
      case 'report':
        Alert.alert('通報', 'このメッセージを運営に通報しました。');
        break;
    }
  };

  // ★ メンションのハイライト表示
  const renderTextWithMentions = (text: string) => {
    // 空白などで分割し、@で始まる単語を探す
    const parts = text.split(/(\s+)/);
    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            // @メンション部分は色を変える
            return (
              <Text key={index} style={styles.mentionText}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  // ★ メッセージ描画
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = authUser && item.userId === authUser.id;
    const isDeleted = !!item.deletedAt;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage
            ? styles.myMessageContainer
            : styles.otherMessageContainer,
        ]}
      >
        {/* リプライ元の表示 */}
        {item.replyTo && !isDeleted && (
          <View style={styles.replyBubble}>
            <Text style={styles.replySender}>@{item.replyTo.userName}</Text>
            <Text numberOfLines={1} style={styles.replyText}>
              {item.replyTo.text}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onLongPress={() => onLongPressMessage(item)}
          activeOpacity={0.8}
          style={[
            styles.messageBubble,
            isMyMessage && styles.myMessageBubble,
            isDeleted && styles.deletedBubble, // 削除済みスタイル
          ]}
        >
          {!isDeleted && (
            <Text
              style={[
                styles.messageSender,
                isMyMessage && styles.myMessageSender,
              ]}
            >
              {item.userName}
            </Text>
          )}

          {isDeleted ? (
            <Text style={styles.deletedText}>
              🚫 メッセージは削除されました
            </Text>
          ) : (
            renderTextWithMentions(item.text)
          )}

          <Text style={styles.messageTime}>
            {item.createdAt
              ?.toDate()
              .toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
          </Text>

          {/* リアクション表示 */}
          {item.reactions &&
            Object.keys(item.reactions).length > 0 &&
            !isDeleted && (
              <View style={styles.reactionsContainer}>
                {Object.values(item.reactions).map((emoji, idx) => (
                  <Text key={idx} style={styles.reactionEmoji}>
                    {emoji}
                  </Text>
                ))}
              </View>
            )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading || !authUser) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
      />

      {/* リプライ中の表示バー */}
      {replyingTo && (
        <View style={styles.replyingBar}>
          <View>
            <Text style={styles.replyingTitle}>
              {replyingTo.userName} への返信
            </Text>
            <Text numberOfLines={1} style={styles.replyingMessage}>
              {replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Text style={styles.cancelReply}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="メッセージを入力... (@でメンション)"
            placeholderTextColor="#888"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim().length === 0 && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={inputText.trim().length === 0}
          >
            <Text style={styles.sendButtonText}>送信</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* --- カスタムメニューモーダル --- */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuContainer}>
              {/* リアクション */}
              <View style={styles.reactionRow}>
                {['❤️', '👍', '😂', '🙏'].map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionBtn}
                    onPress={() =>
                      selectedMessage &&
                      handleReaction(selectedMessage.id, emoji)
                    }
                  >
                    <Text style={styles.reactionMenuEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.menuDivider} />

              {/* アクション */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuAction('reply')}
              >
                <Text style={styles.menuText}>↩️ 返信する</Text>
              </TouchableOpacity>

              {/* 自分のメッセージなら削除、他人なら通報 */}
              {selectedMessage?.userId === authUser.id ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuAction('delete')}
                >
                  <Text style={[styles.menuText, { color: '#FF3B30' }]}>
                    🗑️ 削除する
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuAction('report')}
                >
                  <Text style={[styles.menuText, { color: '#FF3B30' }]}>
                    ⚠️ 通報する
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  // メッセージ
  messageContainer: {
    paddingHorizontal: 10,
    marginVertical: 4,
    maxWidth: '80%',
  },
  otherMessageContainer: { alignSelf: 'flex-start' },
  myMessageContainer: { alignSelf: 'flex-end' },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    backgroundColor: '#1C1C1E',
  },
  myMessageBubble: { backgroundColor: '#0A84FF' },
  deletedBubble: { backgroundColor: '#333', opacity: 0.8 },
  messageSender: { fontSize: 12, color: '#BBBBBB', marginBottom: 2 },
  myMessageSender: { color: '#EFEFEF' },
  messageText: { fontSize: 16, color: '#FFFFFF' },
  mentionText: { fontWeight: 'bold', color: '#64D2FF' }, // メンション色
  deletedText: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  messageTime: {
    fontSize: 10,
    color: '#EEE',
    textAlign: 'right',
    marginTop: 4,
    opacity: 0.7,
  },
  // リプライ表示
  replyBubble: {
    backgroundColor: '#333',
    borderLeftWidth: 3,
    borderLeftColor: '#888',
    padding: 5,
    marginBottom: 2,
    borderRadius: 4,
    opacity: 0.8,
  },
  replySender: { fontSize: 11, color: '#AAA', fontWeight: 'bold' },
  replyText: { fontSize: 12, color: '#DDD' },
  // 入力エリア
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end', // 入力欄が広がった時にボタンを下揃え
  },
  input: {
    flex: 1,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10, // multiline用
    paddingBottom: 10,
    fontSize: 16,
    marginRight: 10,
    maxHeight: 100, // 長くなりすぎないように
  },
  sendButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 15,
    height: 40,
    marginBottom: 2,
  },
  sendButtonDisabled: { backgroundColor: '#555' },
  sendButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  // リプライ中のバー
  replyingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  replyingTitle: { color: '#AAA', fontSize: 12 },
  replyingMessage: { color: '#FFF', fontSize: 14 },
  cancelReply: { color: '#AAA', fontSize: 20, padding: 5 },
  // リアクション
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  reactionEmoji: { fontSize: 12, marginHorizontal: 1 },
  // モーダルメニュー
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#2C2C2E',
    width: 250,
    borderRadius: 12,
    padding: 10,
    elevation: 5,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  reactionBtn: { padding: 5 },
  reactionMenuEmoji: { fontSize: 24 },
  menuDivider: { height: 1, backgroundColor: '#444', marginVertical: 5 },
  menuItem: { paddingVertical: 12, alignItems: 'center' },
  menuText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default ChatScreen;
