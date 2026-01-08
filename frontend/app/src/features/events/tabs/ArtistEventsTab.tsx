import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ArtistEventMin } from '../../../api/queries';

interface Props {
  data: ArtistEventMin[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onPress: (eventId: number) => void;
}

const ArtistEventsTab = ({ data, isRefreshing, onRefresh, onPress }: Props) => {
  const renderItem = ({ item }: { item: ArtistEventMin }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => onPress(item.id)}>
      <Text style={styles.listText}>{item.title}</Text>
      <Text style={styles.subText}>
        {new Date(item.event_date).toLocaleString('ja-JP')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={data.length === 0 ? styles.flexCenter : undefined}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>イベントはありません</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  flexCenter: { flex: 1 },
  listItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  listText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: { color: '#888', fontSize: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: { color: '#888', fontSize: 16 },
});

export default ArtistEventsTab;
