import { useState, useEffect, useCallback } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useAuth } from '../../../context/AuthContext'; // プロジェクトのAuthフックに合わせて調整
import { useEventChatApi } from './useEventChatApi';
import { EventChatMessage, EventChatRole } from '../types';
import { Alert } from 'react-native';

export const useEventChat = (eventId: string, roomId: string) => {
  const { user } = useAuth(); // ログインユーザー情報
  const { consumeForMessage, isConsuming } = useEventChatApi();
  
  const [messages, setMessages] = useState<EventChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // ▼ 1. メッセージのリアルタイム監視
  useEffect(() => {
    if (!eventId || !roomId) return;

    const unsubscribe = firestore()
      .collection('event_chat_rooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'desc') // 最新順
      .limit(50) // 読み込み数制限（コスト削減）
      .onSnapshot(
        (snapshot) => {
          const newMessages = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // TimestampをDate等に変換が必要な場合はここで行う
            } as EventChatMessage;
          });
          setMessages(newMessages);
          setLoading(false);
        },
        (error) => {
          console.error('Chat snapshot error:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [eventId, roomId]);

  // ▼ 2. メッセージ送信フロー (ポイント消費 -> DB書き込み)
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;

    try {
      // Step 1: ポイント消費 APIを叩く
      // ※ ここで失敗（残高不足など）すると catch ブロックへ飛び、書き込みは行われない
      await consumeForMessage({ eventId, roomId });

      // Step 2: Firestoreに書き込み
      const messageData = {
        text: text.trim(),
        // ★修正: DbUser型のプロパティ名に合わせる
        userId: String(user.id),   // Firebase UID
        userName: user.nickname || 'No Name', // ニックネーム
        userIcon: user.image_url || null,    // プロフィール画像URL
        role: 'user' as EventChatRole,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore()
        .collection('event_chat_rooms')
        .doc(roomId)
        .collection('messages')
        .add(messageData);

    } catch (error: any) {
      console.error('Message send error:', error);
      
      // エラーハンドリング (残高不足など)
      if (error.response?.status === 402) {
        Alert.alert('ポイント不足', 'メッセージ送信に必要なポイントが足りません。');
      } else {
        Alert.alert('エラー', '送信に失敗しました。');
      }
    }
  }, [eventId, roomId, user, consumeForMessage]);

  return {
    messages,
    loading,
    sendMessage,
    isSending: isConsuming, // 送信中（API待機中）フラグ
  };
};