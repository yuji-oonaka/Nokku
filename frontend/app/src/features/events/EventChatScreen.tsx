import React, { useState } from 'react';
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
  StatusBar,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements'; // ナビゲーション設定によっては取得できない場合あり

// ★ 今回作成した安全なフックとコンポーネントを使用
import { useAuth } from '../../context/AuthContext';
import { useEventChat } from './hooks/useEventChat';
import { EventChatBubble } from './components/EventChatBubble';
import { SafeAreaView } from 'react-native-safe-area-context';

// 型定義 (必要に応じてナビゲーション型定義ファイルからインポート)
type RouteParams = {
  eventId: string;
  roomId: string;
  roomName?: string;
};

export const EventChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ヘッダーの高さ取得 (取得できない場合は標準的な値をフォールバック)
  const headerHeight = useHeaderHeight ? useHeaderHeight() : 60;

  // パラメータ取得
  const { eventId, roomId, roomName } = route.params as RouteParams;
  const { user } = useAuth();

  // ★ カスタムフック (Firestore監視 + ポイント消費ロジック)
  const { messages, loading, sendMessage, isSending } = useEventChat(
    eventId,
    roomId,
  );
  const [inputText, setInputText] = useState('');

  // 送信ハンドラ
  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    // フック内のロジックで「API消費 -> Firestore書き込み」が実行される
    await sendMessage(inputText);
    setInputText('');
  };

  // 読み込み中表示
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 簡易ヘッダー (必要な場合) */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{roomName || 'チャット'}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <FlatList
          data={messages}
          // ★ IDは文字列比較
          renderItem={({ item }) => (
            <EventChatBubble
              message={item}
              isMe={String(user?.id) === item.userId}
            />
          )}
          keyExtractor={item => item.id}
          inverted // チャットなので下から上へ
          contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 10 }}
        />

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
            maxLength={140} // ツイッター程度に制限推奨
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.sendButtonText}>送信</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// 既存のデザイン定義を流用 (微調整済み)
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
  headerBar: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
    backgroundColor: '#1C1C1E',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 40,
    marginBottom: 2, // inputとの位置合わせ
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
