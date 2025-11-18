import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { EventStackParamList } from '../navigators/EventStackNavigator';
import { useQuery } from '@tanstack/react-query';
import { Event, fetchEvents } from '../api/queries';

type EventListNavigationProp = StackNavigationProp<
  EventStackParamList,
  'EventList'
>;

const EventListScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const navigation = useNavigation<EventListNavigationProp>();

  const {
    data: events,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['events', activeTab],
    queryFn: () => fetchEvents(activeTab),
    // ★ (FIX) キャッシュ有効期間を設定 (5分)
    // これにより、タブ切り替え時に毎回「クルクル」(RefreshControl) が出るのを防ぎます
    staleTime: 1000 * 60 * 5,
  });

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
      {/* タブ切り替えUI */}
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

      {/* コンテンツ表示 */}
      {isLoading ? (
        // 初回ロード中のみ中央スピナーを表示 (タブの下に出る)
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>イベントの取得に失敗しました。</Text>
        </View>
      ) : (
        <FlatList
          data={events || []}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          // データが空の場合の表示
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming'
                  ? '開催予定のイベントはありません'
                  : '過去のイベントはありません'}
              </Text>
            </View>
          }
          // 引っ張って更新 (手動更新の時だけクルクルが出る)
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1C1C1E',
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
    backgroundColor: '#0A84FF',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inactiveTabText: {
    color: '#888888',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  eventItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10,
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
