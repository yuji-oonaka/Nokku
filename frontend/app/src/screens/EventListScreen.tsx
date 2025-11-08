import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { EventStackParamList } from '../navigators/EventStackNavigator';

const API_URL = 'http://10.0.2.2';

// 型定義 (クリーンアップ済み)
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
}

interface Props {
  authToken: string;
}

type EventListNavigationProp = StackNavigationProp<
  EventStackParamList,
  'EventList'
>;

const EventListScreen: React.FC<Props> = ({ authToken }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<EventListNavigationProp>();

  // ↓↓↓ 💥💥💥 ここがエラーの原因でした 💥💥💥 ↓↓↓
  // 画面フォーカス時にイベントを取得 (正しい useFocusEffect)
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
      fetchEvents(); // 同期関数の中で、非同期関数を呼び出す
    }, [authToken]), // 依存配列は useCallback の方に書きます
  );
  // ↑↑↑ 修正ここまで ↑↑↑

  // イベントタップ時の処理
  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetail', {
      event: event,
    });
  };

  // リストの各アイテム
  const renderItem = ({ item }: { item: Event }) => (
    <TouchableOpacity onPress={() => handleEventPress(item)}>
      <View style={styles.eventItem}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventVenue}>{item.venue}</Text>
        <Text style={styles.eventDate}>
          {new Date(item.event_date).toLocaleString('ja-JP')}
        </Text>
      </View>
    </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#121212', padding: 10 },
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
  eventVenue: { fontSize: 16, color: '#BBBBBB', marginTop: 5 },
  eventDate: { fontSize: 14, color: '#888888', marginTop: 5 },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default EventListScreen;
