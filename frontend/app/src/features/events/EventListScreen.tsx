import React, { useState, useCallback } from 'react';
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
import { EventStackParamList } from '../../navigators/EventStackNavigator';
import { useQuery } from '@tanstack/react-query';
import { Event, fetchEvents } from '../../api/queries';
import EventItem from './components/EventItem'; // 作成したコンポーネントをimport

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
    staleTime: 1000 * 60 * 5,
  });

  // 関数をメモ化して再生成を防ぐ
  const handleEventPress = useCallback(
    (item: Event) => {
      navigation.navigate('EventDetail', {
        eventId: item.id,
      });
    },
    [navigation],
  );

  // renderItemもメモ化し、子コンポーネント(EventItem)へ渡す
  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventItem item={item} onPress={handleEventPress} />
    ),
    [handleEventPress],
  );

  // keyExtractorもメモ化（微細な最適化）
  const keyExtractor = useCallback((item: Event) => item.id.toString(), []);

  return (
    <SafeAreaView style={styles.container}>
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

      {isLoading ? (
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
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          // パフォーマンス最適化設定
          initialNumToRender={10}
          windowSize={5}
          maxToRenderPerBatch={10}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming'
                  ? '開催予定のイベントはありません'
                  : '過去のイベントはありません'}
              </Text>
            </View>
          }
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
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default EventListScreen;
