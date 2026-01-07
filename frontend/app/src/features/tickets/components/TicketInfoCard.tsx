import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserTicket } from '../../../api/queries';

interface Props {
  ticket: UserTicket;
}

export const TicketInfoCard: React.FC<Props> = ({ ticket }) => {
  const eventDate = new Date(ticket.event.event_date).toLocaleString('ja-JP');

  return (
    <View style={styles.card}>
      <Text style={styles.eventTitle}>{ticket.event.title}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>日時:</Text>
        <Text style={styles.value}>{eventDate}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>会場:</Text>
        <Text style={styles.value}>{ticket.event.venue}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.seatContainer}>
        <Text style={styles.seatType}>{ticket.ticket_type.name}</Text>
        <Text style={styles.seatNumber}>{ticket.seat_number}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { color: '#888', width: 50, fontSize: 14 },
  value: { color: '#FFF', fontSize: 14, flex: 1 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 15 },
  seatContainer: { alignItems: 'center' },
  seatType: { color: '#AAA', fontSize: 14, marginBottom: 5 },
  seatNumber: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
});
