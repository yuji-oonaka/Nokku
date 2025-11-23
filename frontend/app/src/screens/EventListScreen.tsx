import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
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
    staleTime: 1000 * 60 * 5,
  });

  const handleEventPress = (item: Event) => {
    navigation.navigate('EventDetail', {
      eventId: item.id,
    });
  };

  const renderItem = ({ item }: { item: Event }) => (
    <TouchableOpacity
      onPress={() => handleEventPress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.eventItem}>
        {/* ★ 左側: イベント画像 (あれば表示) */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.eventImage} />
        ) : (
          <View style={[styles.eventImage, styles.imagePlaceholder]} />
        )}

        {/* ★ 右側: 情報エリア */}
        <View style={styles.eventInfo}>
          {/* 1. 主催者名 (テキストのみでシンプルに) */}
          {item.artist && (
            <Text style={styles.organizerNameSimple} numberOfLines={1}>
              {item.artist.nickname} presents
            </Text>
          )}

          {/* 2. イベント情報 */}
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.eventVenue} numberOfLines={1}>
            📍 {item.venue}
          </Text>
          <Text style={styles.eventDate}>
            📅 {new Date(item.event_date).toLocaleString('ja-JP')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
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
  // カードレイアウト
  eventItem: {
    backgroundColor: '#1C1C1E',
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    height: 110,
  },
  eventImage: {
    width: 110,
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#333',
  },
  imagePlaceholder: {
    backgroundColor: '#333',
  },
  eventInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  // ★ シンプルな主催者名スタイル
  organizerNameSimple: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    flex: 1,
  },
  eventVenue: { fontSize: 12, color: '#BBBBBB', marginBottom: 2 },
  eventDate: { fontSize: 12, color: '#0A84FF', fontWeight: 'bold' },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default EventListScreen;
