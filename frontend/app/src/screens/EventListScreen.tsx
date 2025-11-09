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
// ↓↓↓ パスはご自身の環境に合わせてください
import { EventStackParamList } from '../navigation/EventStackNavigator';
import api from '../services/api'; // 1. ★ api.ts をインポート

// 型定義
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
}

// 2. ★ Props (authToken) を削除
// interface Props {
//   authToken: string;
// }

type EventListNavigationProp = StackNavigationProp<
  EventStackParamList,
  'EventList'
>;

// 3. ★ React.FC<Props> から React.FC に変更
const EventListScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<EventListNavigationProp>();

  // 4. ★ fetchEvents を api.ts を使うようにリファクタリング
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      // 'fetch' と 'headers', 'authToken' が不要になります
      const response = await api.get('/events');
      setEvents(response.data); // .json() も不要
    } catch (error: any) {
      Alert.alert('エラー', 'イベントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []); // 5. ★ authToken の依存を削除

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  // 6. ★★★★★ 修正ポイント ★★★★★
  // イベントタップ時の処理
  const handleEventPress = (item: Event) => {
    navigation.navigate('EventDetail', {
      eventId: item.id, // 👈 'event' オブジェクト全体ではなく、'eventId' (数値) を渡す
    });
  };

  // リストの各アイテム
  const renderItem = ({ item }: { item: Event }) => (
    // 7. ★ handleEventPress(item) に修正
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
// 8. ★ 他の画面とテーマを統一
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 10 }, // #121212 -> #000000
  eventItem: {
    backgroundColor: '#1C1C1E', // #222 -> #1C1C1E
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
