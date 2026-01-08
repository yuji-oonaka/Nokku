import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { TicketType } from '../../../api/queries';

interface Props {
  tickets: TicketType[];
  isAdminOrOwner: boolean | undefined;
  buyingTicketId: number | null;
  onBuy: (ticket: TicketType) => void;
  onDelete: (ticket: TicketType) => void;
}

const TicketPurchaseList = ({
  tickets,
  isAdminOrOwner,
  buyingTicketId,
  onBuy,
  onDelete,
}: Props) => {
  if (tickets.length === 0) {
    return (
      <Text style={styles.emptyText}>まだチケットが登録されていません。</Text>
    );
  }

  return (
    <View>
      {tickets.map(item => (
        <View key={item.id} style={styles.ticketItem}>
          <View>
            <Text style={styles.ticketName}>{item.name}</Text>
            <Text style={styles.ticketPrice}>
              ¥{item.price.toLocaleString()}
            </Text>
            <Text style={styles.ticketCapacity}>
              残り: {item.capacity}枚
              {item.seating_type === 'random' ? ' (自動座席指定)' : ' (自由席)'}
            </Text>
          </View>
          <View style={styles.buttonGroup}>
            {isAdminOrOwner ? (
              <Button
                title="削除"
                color="#FF3B30"
                onPress={() => onDelete(item)}
              />
            ) : (
              <Button
                title={buyingTicketId === item.id ? '処理中...' : '購入する'}
                onPress={() => onBuy(item)}
                disabled={buyingTicketId !== null}
              />
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  ticketItem: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  ticketPrice: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 5,
    fontWeight: 'bold',
  },
  ticketCapacity: { fontSize: 12, color: '#888', marginTop: 2 },
  buttonGroup: { flexDirection: 'row' },
});

export default TicketPurchaseList;
