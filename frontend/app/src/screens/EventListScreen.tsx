import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList, // リスト表示用のコンポーネント
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// APIのURL
const API_URL = 'http://10.0.2.2';

// Eventの型を定義 (TypeScript)
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  price: number;
}

// ★注意★: このコンポーネントは、App.tsxから 'authToken' を受け取る前提です
interface Props {
  authToken: string; // 認証済みトークン
}

const EventListScreen: React.FC<Props> = ({ authToken }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      // この外側の関数は「同期的」です

      const fetchEvents = async () => {
        // この内側の関数で「非同期」処理を行います
        try {
          setLoading(true);
          const response = await fetch(`${API_URL}/api/events`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (!response.ok) {
            throw new Error('イベントの取得に失敗しました');
          }

          const data = (await response.json()) as Event[];
          setEvents(data);
        } catch (error: any) {
          Alert.alert('エラー', error.message);
        } finally {
          setLoading(false);
        }
      };

      // 同期関数の中で、非同期関数を呼び出す
      fetchEvents();

      // (オプション：画面から離れた時のクリーンアップ処理)
      // return () => {};
    }, [authToken]), // 依存配列は useCallback の方に書きます
  );

  // リストの各アイテムをどう表示するかの定義
  const renderItem = ({ item }: { item: Event }) => (
    <View style={styles.eventItem}>
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventVenue}>{item.venue}</Text>
      <Text style={styles.eventDate}>
        {/* 日時を読みやすい形式にフォーマット */}
        {new Date(item.event_date).toLocaleString('ja-JP')}
      </Text>
      <Text style={styles.eventPrice}>¥{item.price.toLocaleString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : events.length === 0 ? (
        <Text style={styles.emptyText}>開催予定のイベントはありません</Text>
      ) : (
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
        />
      )}
    </SafeAreaView>
  );
};

// --- スタイルシート ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 10,
  },
  eventItem: {
    backgroundColor: '#222',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  eventVenue: {
    fontSize: 16,
    color: '#BBBBBB',
    marginTop: 5,
  },
  eventDate: {
    fontSize: 14,
    color: '#888888',
    marginTop: 5,
  },
  eventPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50', // 価格は緑色
    marginTop: 10,
    textAlign: 'right',
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default EventListScreen;
