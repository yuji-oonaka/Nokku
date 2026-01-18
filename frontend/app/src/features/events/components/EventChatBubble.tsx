import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { EventChatMessage } from '../types';

interface Props {
  message: EventChatMessage;
  isMe: boolean;
}

export const EventChatBubble: React.FC<Props> = ({ message, isMe }) => {
  // 権限に応じたバッジ表示
  const renderRoleBadge = () => {
    if (message.role === 'staff' || message.role === 'admin') {
      return (
        <View style={[styles.badge, styles.badgeStaff]}>
          <Text style={styles.badgeText}>OFFICIAL</Text>
        </View>
      );
    }
    if (message.role === 'artist') {
      return (
        <View style={[styles.badge, styles.badgeArtist]}>
          <Text style={styles.badgeText}>ARTIST</Text>
        </View>
      );
    }
    return null;
  };

  // タイムスタンプのフォーマット (Firestore Timestamp -> Date -> String)
  const formatTime = () => {
    if (!message.createdAt) return '';
    const date = message.createdAt.toDate(); // Firestore Timestamp method
    return `${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.containerMe : styles.containerOther,
      ]}
    >
      {/* 他人の場合のみアイコン表示 */}
      {!isMe && (
        <Image
          source={
            message.userIcon
              ? { uri: message.userIcon }
              : require('../../../assets/images/default_icon.jpg')
          }
          style={styles.icon}
        />
      )}

      <View
        style={[
          styles.contentContainer,
          isMe ? styles.contentMe : styles.contentOther,
        ]}
      >
        {/* 名前とバッジ (他人のみ表示) */}
        {!isMe && (
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{message.userName}</Text>
            {renderRoleBadge()}
          </View>
        )}

        {/* メッセージ本文 */}
        <View
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.textMe : styles.textOther,
            ]}
          >
            {message.text}
          </Text>
        </View>

        {/* 時刻 */}
        <Text style={styles.timeText}>{formatTime()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  containerMe: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  contentContainer: {
    maxWidth: '75%',
  },
  contentMe: {
    alignItems: 'flex-end',
  },
  contentOther: {
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  nameText: {
    fontSize: 12,
    color: '#666',
    marginRight: 6,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#007AFF', // アクセントカラー
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#E5E5EA',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMe: {
    color: '#FFF',
  },
  textOther: {
    color: '#000',
  },
  timeText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  // バッジスタイル
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeStaff: {
    backgroundColor: '#FF3B30', // 赤
  },
  badgeArtist: {
    backgroundColor: '#FFD700', // ゴールド
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
