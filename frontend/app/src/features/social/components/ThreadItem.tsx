import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// 型定義 (ChatLobbyScreenから移動)
export interface ChatThread {
  id: string;
  title: string;
  description?: string;
  isSystem?: boolean;
  createdAt?: FirebaseFirestoreTypes.Timestamp;
  createdBy?: {
    id: number;
    nickname: string;
  };
}

interface ThreadItemProps {
  item: ChatThread;
  onPress: (item: ChatThread) => void;
}

// 日付フォーマット関数
const formatDate = (timestamp?: FirebaseFirestoreTypes.Timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
};

export const ThreadItem = React.memo(({ item, onPress }: ThreadItemProps) => {
  if (item.isSystem) {
    // 固定スレッド
    return (
      <TouchableOpacity
        style={[styles.threadItem, styles.systemThreadItem]}
        onPress={() => onPress(item)}
      >
        <View style={styles.threadIconSystem}>
          <Text style={styles.threadIconTextSystem}>📌</Text>
        </View>
        <View style={styles.threadInfo}>
          <Text style={styles.threadTitleSystem}>{item.title}</Text>
          <Text style={styles.threadDescription}>{item.description}</Text>
        </View>
      </TouchableOpacity>
    );
  } else {
    // ユーザー投稿スレッド
    return (
      <TouchableOpacity style={styles.threadItem} onPress={() => onPress(item)}>
        <View style={styles.threadIcon}>
          <Text style={styles.threadIconText}>#</Text>
        </View>
        <View style={styles.threadInfo}>
          <Text style={styles.threadTitle}>{item.title}</Text>
          <Text style={styles.threadMeta} numberOfLines={1}>
            作成: {item.createdBy?.nickname}
          </Text>
        </View>
        <View style={styles.threadRight}>
          <Text style={styles.threadDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  }
});

const styles = StyleSheet.create({
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  systemThreadItem: {
    backgroundColor: '#1C1C1E',
    borderLeftWidth: 4,
    borderLeftColor: '#0A84FF',
  },
  threadIconSystem: { marginRight: 12 },
  threadIconTextSystem: { fontSize: 20 },
  threadTitleSystem: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  threadDescription: { fontSize: 12, color: '#AAA', marginTop: 2 },
  threadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threadIconText: { fontSize: 16, color: '#888', fontWeight: 'bold' },
  threadInfo: { flex: 1 },
  threadTitle: { fontSize: 16, fontWeight: 'bold', color: '#DDD' },
  threadMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  threadRight: { alignItems: 'flex-end' },
  threadDate: { fontSize: 11, color: '#555' },
});
