import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { UserTicket } from '../../../api/queries';

type Props = {
  item: UserTicket;
  onPress: (ticket: UserTicket) => void;
};

const TicketListItem: React.FC<Props> = React.memo(({ item, onPress }) => {
  // 日付計算とステータス判定のロジック整理
  const { eventDateString, statusInfo } = useMemo(() => {
    const eventDate = new Date(item.event.event_date);
    const now = new Date();

    // 終了判定: イベント日時 + 24時間 を過ぎているか
    const isFinished =
      now.getTime() > eventDate.getTime() + 24 * 60 * 60 * 1000;

    let statusText = '';
    let statusStyle = {};

    if (isFinished) {
      statusText = '終了';
      statusStyle = styles.badgeFinished;
    } else if (item.is_used) {
      statusText = '入場済み';
      statusStyle = styles.badgeUsed;
    } else {
      statusText = '未使用';
      statusStyle = styles.badgeUnused;
    }

    return {
      eventDateString: eventDate.toLocaleString('ja-JP'),
      statusInfo: { text: statusText, style: statusStyle },
    };
  }, [item.event.event_date, item.is_used]);

  return (
    <TouchableOpacity
      style={[styles.ticketItem, item.is_used && styles.ticketItemUsed]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.ticketInfo}>
        {/* ステータスバッジ */}
        <View style={styles.statusBadgeRow}>
          <Text style={statusInfo.style}>{statusInfo.text}</Text>
        </View>

        <Text style={styles.eventTitle}>{item.event.title}</Text>
        <Text style={styles.ticketDetail}>
          {item.ticket_type.name} / {item.seat_number}
        </Text>
        <Text style={styles.ticketDetail}>{item.event.venue}</Text>
        <Text style={styles.ticketDetail}>{eventDateString}</Text>
      </View>

      {/* 右端の矢印 */}
      <View style={styles.rightIcon}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  ticketItem: {
    backgroundColor: '#222',
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#0A84FF', // 未使用色
  },
  ticketItemUsed: {
    backgroundColor: '#1C1C1E',
    borderLeftColor: '#34C759', // 使用済み色
    opacity: 0.8,
  },
  ticketInfo: {
    flex: 1,
  },
  statusBadgeRow: {
    marginBottom: 5,
    flexDirection: 'row',
  },
  badgeUnused: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeUsed: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeFinished: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(136, 136, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ticketDetail: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 2,
  },
  rightIcon: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  arrow: {
    color: '#555',
    fontSize: 24,
  },
});

export default TicketListItem;
