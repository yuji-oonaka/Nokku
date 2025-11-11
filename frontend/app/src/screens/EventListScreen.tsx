import React, { useState, useCallback } from 'react'; // 1. ★ useEffect は不要に
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
import { EventStackParamList } from '../navigation/EventStackNavigator';
import api from '../services/api';

// (Event 型定義は変更なし)
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
}

type EventListNavigationProp = StackNavigationProp<
  EventStackParamList,
  'EventList'
>;

const EventListScreen: React.FC = () => {
  // 2. ★ activeTab State を追加 (デフォルトは 'upcoming')
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<EventListNavigationProp>();

  // 3. ★ fetchEvents を activeTab (State) に基づいて取得するように修正
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      // 4. ★ /api/events?filter=... を呼び出す
      const response = await api.get(`/events?filter=${activeTab}`);
      setEvents(response.data);
    } catch (error: any) {
      Alert.alert('エラー', 'イベントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [activeTab]); // 5. ★ activeTab が変更されたら、この関数が再構築される

  // 6. ★ useFocusEffect を修正
  //    (画面フォーカス時、または fetchEvents 関数が再構築された時 に実行)
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  // (handleEventPress, renderItem は変更なし)
  const handleEventPress = (item: Event) => {
    navigation.navigate('EventDetail', {
      eventId: item.id,
    });
  };

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
      {/* 7. ★★★ タブ切り替えUIを追加 ★★★ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'upcoming' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={
              activeTab === 'upcoming'
                ? styles.activeTabText
                : styles.inactiveTabText
            }
          >
            開催予定
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'past' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={
              activeTab === 'past'
                ? styles.activeTabText
                : styles.inactiveTabText
            }
          >
            過去のイベント
          </Text>
        </TouchableOpacity>
      </View>
      {/* ★★★ ここまで ★★★ */}

      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : events.length === 0 ? (
        // 8. ★ 空のメッセージをタブごとに変更
        <Text style={styles.emptyText}>
          {activeTab === 'upcoming'
            ? '開催予定のイベントはありません'
            : '過去のイベントはありません'}
        </Text>
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

// 9. ★★★ スタイルシートにタブ用のスタイルを追加 ★★★
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' }, // 背景を #121212 -> #000000 に統一
  // --- タブUI ---
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1C1C1E', // タブの背景
    paddingVertical: 10,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#0A84FF', // アクティブなタブの背景色
  },
  activeTabText: {
    color: '#FFFFFF', // アクティブなテキスト色
    fontWeight: 'bold',
    fontSize: 16,
  },
  inactiveTabText: {
    color: '#888888', // 非アクティブなテキスト色
    fontSize: 16,
  },
  // --- リスト ---
  eventItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10, // 左右マージンを追加
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
