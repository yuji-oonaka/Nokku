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
  Platform, // Platformをインポート
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Image,
  StatusBar, // ステータスバーの高さを取得するためにインポート
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
// ★ 変更1: SafeAreaViewではなく、Insetsを取得するフックを使う
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventStackParamList } from '../navigators/EventStackNavigator';

type ChatScreenRouteProp = RouteProp<EventStackParamList, 'Chat'>;

interface ChatMessage {
  id: string;
  text: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  userId: number;
  userName: string;
  userImage?: string;
  deletedAt?: FirebaseFirestoreTypes.Timestamp;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  reactions?: {
    [userId: number]: string;
  };
}

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const { eventId, threadId } = route.params;
  const { user: authUser } = useAuth();

  // ★ 変更2: 画面の安全領域（ノッチやホームバー）の高さを取得
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

  const formatMessageTime = (timestamp: FirebaseFirestoreTypes.Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();
    const timeString = date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) return timeString;
    if (isThisYear)
      return `${date.getMonth() + 1}/${date.getDate()} ${timeString}`;
    return `${date.getFullYear()}/${
      date.getMonth() + 1
    }/${date.getDate()} ${timeString}`;
  };

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

  const onLongPressMessage = (message: ChatMessage) => {
    if (message.deletedAt) return;
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

  const renderTextWithMentions = (text: string) => {
    const parts = text.split(/(\s+)/);
    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = authUser && item.userId === authUser.id;
    const isDeleted = !!item.deletedAt;

    return (
      <View
        style={[
          styles.rowContainer,
          isMyMessage ? styles.rowRight : styles.rowLeft,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            {item.userImage ? (
              <Image source={{ uri: item.userImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
          </View>
        )}

        <View style={styles.bubbleWrapper}>
          {!isMyMessage && !isDeleted && (
            <Text style={styles.messageSenderName}>{item.userName}</Text>
          )}

          <TouchableOpacity
            onLongPress={() => onLongPressMessage(item)}
            activeOpacity={0.8}
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
              isDeleted && styles.deletedBubble,
            ]}
          >
            {item.replyTo && !isDeleted && (
              <View style={styles.replyBubble}>
                <Text style={styles.replySender}>@{item.replyTo.userName}</Text>
                <Text numberOfLines={1} style={styles.replyText}>
                  {item.replyTo.text}
                </Text>
              </View>
            )}

            {isDeleted ? (
              <Text style={styles.deletedText}>
                🚫 メッセージは削除されました
              </Text>
            ) : (
              renderTextWithMentions(item.text)
            )}
          </TouchableOpacity>

          <View style={styles.metaContainer}>
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
            <Text style={styles.messageTime}>
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      // ★ 変更3: ここもSafeAreaViewではなくView + paddingTopで調整
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    // ★ 変更4: 一番外側をSafeAreaViewではなく通常のViewにし、上部の余白(insets.top)を付与
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // ★修正: Androidでも 'padding' を強制的に適用します
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        // iOSの場合、ヘッダーの高さ分（約60〜90）をオフセット
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? headerHeight
            : headerHeight + (StatusBar.currentHeight || 0)
        }
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
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

        {/* ★ 変更6: 入力エリアの下部に、ホームバーの高さ分(insets.bottom)の余白を与える */}
        <View
          style={[
            styles.inputContainer,
            {
              // ★修正: 'padding'挙動にする場合、iOSのみ下底の余白(Home Indicator)を確保
              // AndroidはKeyboardAvoidingViewが押し上げるので余計なpaddingは不要
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  rowContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    backgroundColor: '#555',
  },
  bubbleWrapper: {
    maxWidth: '70%',
  },
  messageSenderName: {
    fontSize: 11,
    color: '#CCC',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 14,
    minWidth: 40,
  },
  myMessageBubble: {
    backgroundColor: '#0A84FF',
    borderTopRightRadius: 2,
  },
  otherMessageBubble: {
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 2,
  },
  deletedBubble: { backgroundColor: '#333', opacity: 0.8 },

  messageText: { fontSize: 15, color: '#FFFFFF', lineHeight: 20 },
  mentionText: { fontWeight: 'bold', color: '#64D2FF' },
  deletedText: { fontSize: 14, color: '#888', fontStyle: 'italic' },

  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
    marginRight: 2,
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },

  replyBubble: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#CCC',
    padding: 5,
    marginBottom: 5,
    borderRadius: 4,
  },
  replySender: { fontSize: 11, color: '#EEE', fontWeight: 'bold' },
  replyText: { fontSize: 12, color: '#DDD' },

  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10, // 上下のパディングはインラインスタイルで制御するため削除
    paddingTop: 10, // 上だけ固定
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
    marginBottom: 2, // ボタンの位置微調整
  },
  sendButtonDisabled: { backgroundColor: '#555' },
  sendButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
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
  reactionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  reactionEmoji: { fontSize: 10, marginHorizontal: 1 },
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
