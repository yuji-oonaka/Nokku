import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserTicket } from '../../../api/queries';

interface Props {
  item: UserTicket;
  onPress: (ticket: UserTicket) => void;
}

const TicketListItem: React.FC<Props> = ({ item, onPress }) => {
  // デバッグ用: コンソールにデータが出ているか確認してください
  console.log('Ticket Item:', item);

  const isUsed = item.status === 'used';
  const isCancelled = item.status === 'cancelled';
  const dateObj = new Date(item.event.event_date);
  const day = dateObj.getDate();
  const month = dateObj
    .toLocaleString('en-US', { month: 'short' })
    .toUpperCase();

  return (
    <TouchableOpacity
      // キャンセル済みの場合もグレーアウトさせるなどの考慮が可能
      style={[styles.card, isUsed || isCancelled ? styles.cardUsed : null]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      disabled={isCancelled} // キャンセル済みの場合は詳細不可にする等のガード
    >
      <View
        style={[
          styles.dateBox,
          isUsed || isCancelled ? styles.dateBoxUsed : null,
        ]}
      >
        <Text style={styles.dateText}>{day}</Text>
        <Text style={styles.monthText}>{month}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {item.event.title}
        </Text>

        <View style={styles.row}>
          <Text style={styles.seatText}>
            {item.ticket_type.name} / {item.seat_number}
          </Text>
        </View>

        <View style={styles.idRow}>
          <Text style={styles.idLabel}>Ticket ID:</Text>
          <Text style={styles.idValue}>#{item.id}</Text>
        </View>

        {isUsed && (
          <View style={styles.usedBadge}>
            <Text style={styles.usedText}>USED</Text>
          </View>
        )}
        {isCancelled && (
          <View style={[styles.usedBadge, { borderColor: '#FF3B30' }]}>
            <Text style={[styles.usedText, { color: '#FF3B30' }]}>
              CANCELLED
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    height: 100,
  },
  cardUsed: { opacity: 0.6 },
  dateBox: {
    width: 70,
    backgroundColor: '#7C4DFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBoxUsed: { backgroundColor: '#555' },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  monthText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  seatText: {
    color: '#CCC',
    fontSize: 14,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  idLabel: {
    color: '#888',
    fontSize: 12,
    marginRight: 4,
  },
  idValue: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  usedBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#666',
  },
  usedText: {
    color: '#AAA',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default TicketListItem;
