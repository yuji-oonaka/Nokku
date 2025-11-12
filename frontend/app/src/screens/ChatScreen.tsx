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
  Platform 
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// ナビゲーションパラメータの型
type ChatScreenRouteProp = RouteProp<EventStackParamList, 'Chat'>;

// メッセージの型
interface ChatMessage {
  id: string; // Firestore Document ID
  text: string;
  createdAt: firestore.Timestamp;
  userId: number;
  userName: string;
}

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const { eventId, threadId } = route.params;
  const { user: authUser } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');

  // Firestore コレクション参照
  const messagesRef = firestore()
    .collection('event_chats')
    // イベントIDのドキュメント (event_chats/event_1)
    .doc(`event_${eventId}`)
    // ↓↓↓ スレッドIDのサブコレクションを新たに追加 ↓↓↓
    .collection('threads')
    .doc(threadId)
    .collection('messages');

  // 1. リアルタイムメッセージ購読
  useEffect(() => {
    if (!eventId) return;

    // createdAt で降順にソートし、リアルタイムで購読
    const subscriber = messagesRef
      .orderBy('createdAt', 'desc')
      .onSnapshot(querySnapshot => {
        if (!querySnapshot) return;
        
        const fetchedMessages: ChatMessage[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text,
            createdAt: data.createdAt,
            userId: data.userId,
            userName: data.userName,
          } as ChatMessage;
        });

        setMessages(fetchedMessages);
        setLoading(false);
      }, error => {
        console.error("Firestore subscription error:", error);
        setLoading(false);
      });

    return () => subscriber(); // クリーンアップ
  }, [eventId]);

  // 2. メッセージ送信処理
  const handleSend = useCallback(() => {
    if (inputText.trim().length === 0 || !authUser) return;

    const message = {
      text: inputText.trim(),
      createdAt: firestore.Timestamp.now(), // サーバー側の正確なタイムスタンプ
      userId: authUser.id,
      userName: authUser.nickname,
    };

    messagesRef.add(message);
    setInputText('');
  }, [inputText, authUser, messagesRef]);

  // メッセージアイテムのレンダリング
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = authUser && item.userId === authUser.id;
    return (
      <View style={[
        styles.messageContainer, 
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={styles.messageBubble}>
          <Text style={styles.messageSender}>{item.userName}</Text>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTime}>
            {item.createdAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading || !authUser) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={{color: '#888', marginTop: 10}}>チャットを読み込み中...</Text>
      </SafeAreaView>
    );
  }

  // UI
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted // 最新メッセージを下に表示
      />
      
      {/* 3. キーボード対応の入力エリア */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="メッセージを入力..."
            placeholderTextColor="#888"
            onSubmitEditing={handleSend} // エンターキーで送信 (一部OSのみ)
            blurOnSubmit={false}
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSend}
            disabled={inputText.trim().length === 0}
          >
            <Text style={styles.sendButtonText}>送信</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  // --- メッセージ表示スタイル ---
  messageContainer: {
    paddingHorizontal: 10,
    marginVertical: 4,
    maxWidth: '80%',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    backgroundColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  myMessageContainer_messageBubble: {
  backgroundColor: '#0A84FF',
  },
  messageSender: {
    fontSize: 12,
    color: '#BBBBBB',
    marginBottom: 2,
  },
  myMessageContainer_messageSender: {
  color: '#EFEFEF',
  },
  messageText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    textAlign: 'right',
    marginTop: 5,
  },
  // --- 入力エリア ---
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 10,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default ChatScreen;