import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// チャットでの役割
export type EventChatRole = 'user' | 'artist' | 'staff' | 'admin';

// Firestore: event_chat_messages
export interface EventChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userIcon?: string;
  role: EventChatRole;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

// Firestore: event_chat_rooms
export interface EventChatRoom {
  id: string;
  eventId?: string;    // 固定ルームの場合は無いことがあるので optional (?) に変更
  name: string;
  createdBy?: string;  // 固定ルームは作成者がいないので optional
  status?: 'open' | 'full' | 'closed';
  participantCount?: number;
  createdAt?: FirebaseFirestoreTypes.Timestamp;
  
  // ★ 追加: ロビー表示用
  isSystem?: boolean;
  description?: string;
}

// API Response
export interface ConsumePointResponse {
  status: 'success' | 'error';
  consumed?: number;
  message?: string;
}