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
  StatusBar,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventStackParamList } from '../../navigators/EventStackNavigator';
// ★ 作成したコンポーネントをインポート
import { MessageBubble, ChatMessage } from './components/MessageBubble';

type ChatScreenRouteProp = RouteProp<EventStackParamList, 'Chat'>;

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const { eventId, threadId } = route.params;
  const { user: authUser } = useAuth();

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight ? useHeaderHeight() : 0;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [limitCount, setLimitCount] = useState(100);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
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

  // --- 1. メッセージ取得 ---
  useEffect(() => {
    if (!eventId) return;

    const subscriber = messagesRef
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .onSnapshot(
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
              userImage: data.userImage,
              deletedAt: data.deletedAt,
              replyTo: data.replyTo,
              reactions: data.reactions,
            } as ChatMessage;
          });
          setMessages(fetchedMessages);
          setLoading(false);
          setIsLoadingMore(false);
        },
        error => {
          console.error('Firestore error:', error);
          setLoading(false);
          setIsLoadingMore(false);
        },
      );
    return () => subscriber();
  }, [eventId, limitCount]);

  const loadMoreMessages = () => {
    if (!loading && !isLoadingMore && messages.length >= limitCount) {
      setIsLoadingMore(true);
      setLimitCount(prev => prev + 100);
    }
  };

  // --- 2. メッセージ送信 ---
  const handleSend = useCallback(() => {
    if (inputText.trim().length === 0 || !authUser) return;

    const messageData: any = {
      text: inputText.trim(),
      createdAt: firestore.Timestamp.now(),
      userId: authUser.id,
      userName: authUser.nickname,
      userImage: authUser.image_url || null,
    };

    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        userName: replyingTo.userName,
        text: replyingTo.text,
      };
    }

    messagesRef.add(messageData);
    setInputText('');
    setReplyingTo(null);
  }, [inputText, authUser, messagesRef, replyingTo]);

  // --- 3. アクション処理 (削除・リアクション) ---
  const handleDelete = async (messageId: string) => {
    try {
      await messagesRef.doc(messageId).update({
        deletedAt: firestore.Timestamp.now(),
      });
      Alert.alert('完了', 'メッセージを削除しました');
    } catch (error) {
      Alert.alert('エラー', '削除に失敗しました');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!authUser) return;
    const fieldPath = `reactions.${authUser.id}`;
    await messagesRef.doc(messageId).update({
      [fieldPath]: emoji,
    });
    setMenuVisible(false);
  };

  const onLongPressMessage = useCallback((message: ChatMessage) => {
    if (message.deletedAt) return;
    setSelectedMessage(message);
    setMenuVisible(true);
  }, []);

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

  // ❌ 削除: renderMessage, formatMessageTime, renderTextWithMentions

  if (loading && messages.length === 0) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? headerHeight
            : headerHeight + (StatusBar.currentHeight || 0)
        }
      >
        <FlatList
          data={messages}
          // ★ここでコンポーネントを使用
          renderItem={({ item }) => (
            <MessageBubble
              item={item}
              currentUserId={authUser?.id}
              onLongPress={onLongPressMessage}
            />
          )}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={{ paddingVertical: 10 }}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                size="small"
                color="#888"
                style={{ padding: 10 }}
              />
            ) : null
          }
        />

        {/* リプライバー */}
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

        {/* 入力エリア */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom:
                Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="メッセージを入力..."
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

      {/* メニューモーダル */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuContainer}>
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
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuAction('reply')}
              >
                <Text style={styles.menuText}>↩️ 返信する</Text>
              </TouchableOpacity>
              {selectedMessage?.userId === authUser?.id ? (
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
    </View>
  );
};

// ★ スタイルの大掃除完了版
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  // ❌ 削除: rowContainer, avatar..., bubble... など吹き出し関連のスタイル

  // --- 入力エリア ---
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    marginRight: 10,
    maxHeight: 100,
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

  // --- リプライバー ---
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

  // --- モーダル・メニュー ---
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
