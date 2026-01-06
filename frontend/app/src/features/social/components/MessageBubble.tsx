import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface ChatMessage {
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

interface MessageBubbleProps {
  item: ChatMessage;
  currentUserId?: number;
  onLongPress: (message: ChatMessage) => void;
}

const formatMessageTime = (timestamp: FirebaseFirestoreTypes.Timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeString = date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (isToday) return timeString;
  return `${date.getMonth() + 1}/${date.getDate()} ${timeString}`;
};

export const MessageBubble = React.memo(
  ({ item, currentUserId, onLongPress }: MessageBubbleProps) => {
    const isMyMessage = currentUserId === item.userId;
    const isDeleted = !!item.deletedAt;

    const renderTextWithMentions = (text: string) => {
      const parts = text.split(/(\s+)/);
      return (
        <Text style={styles.messageText}>
          {parts.map((part, index) =>
            part.startsWith('@') ? (
              <Text key={index} style={styles.mentionText}>
                {part}
              </Text>
            ) : (
              <Text key={index}>{part}</Text>
            ),
          )}
        </Text>
      );
    };

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
            onLongPress={() => onLongPress(item)}
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
  },
);

const styles = StyleSheet.create({
  // ★ ChatScreen から必要なスタイルだけ移動
  rowContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  avatarContainer: { marginRight: 8, marginTop: 0 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333' },
  avatarPlaceholder: { backgroundColor: '#555' },
  bubbleWrapper: { maxWidth: '70%' },
  messageSenderName: {
    fontSize: 11,
    color: '#CCC',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: { padding: 10, borderRadius: 14, minWidth: 40 },
  myMessageBubble: { backgroundColor: '#0A84FF', borderTopRightRadius: 2 },
  otherMessageBubble: { backgroundColor: '#2C2C2E', borderTopLeftRadius: 2 },
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
  messageTime: { fontSize: 10, color: '#666', marginLeft: 4 },
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
  reactionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  reactionEmoji: { fontSize: 10, marginHorizontal: 1 },
});
