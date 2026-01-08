import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Event } from '../../../api/queries';

interface Props {
  item: Event;
  onPress: (event: Event) => void;
}

const EventItem = memo(({ item, onPress }: Props) => {
  // 日付整形ロジックを簡略化（必要に応じて date-fns 等を利用）
  const formattedDate = new Date(item.event_date).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.9}
      style={styles.container} // マージン調整のためWrapper的なスタイルは親で制御せずここで完結させる手もあり
    >
      <View style={styles.eventItem}>
        {/* 左側: 画像 */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.eventImage} />
        ) : (
          <View style={[styles.eventImage, styles.imagePlaceholder]} />
        )}

        {/* 右側: 情報エリア */}
        <View style={styles.eventInfo}>
          {item.artist && (
            <Text style={styles.organizerNameSimple} numberOfLines={1}>
              {item.artist.nickname} presents
            </Text>
          )}

          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.eventVenue} numberOfLines={1}>
            📍 {item.venue}
          </Text>
          <Text style={styles.eventDate}>📅 {formattedDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 10,
  },
  eventItem: {
    backgroundColor: '#1C1C1E', // Dark Mode Card Color
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
  eventVenue: {
    fontSize: 12,
    color: '#BBBBBB',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#0A84FF',
    fontWeight: 'bold',
  },
});

export default EventItem;
