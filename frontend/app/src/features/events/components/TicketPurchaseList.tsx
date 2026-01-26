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
      {tickets.map(item => {
        // ★ 在庫切れ判定
        const isSoldOut = item.remaining_count <= 0;

        return (
          <View key={item.id} style={[styles.ticketItem, isSoldOut && styles.ticketItemSoldOut]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketName}>{item.name}</Text>
              <Text style={styles.ticketPrice}>
                ¥{item.price.toLocaleString()}
              </Text>
              
              {/* ★ capacity ではなく remaining_count を表示 */}
              <Text style={[styles.ticketCapacity, isSoldOut && styles.soldOutText]}>
                残り: {isSoldOut ? '完売' : `${item.remaining_count}枚`} 
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
                  // ★ 在庫切れ時は「完売」と表示
                  title={
                    isSoldOut 
                      ? '完売' 
                      : (buyingTicketId === item.id ? '処理中...' : '購入する')
                  }
                  onPress={() => onBuy(item)}
                  // ★ 処理中、または在庫切れ時にボタンを無効化
                  disabled={buyingTicketId !== null || isSoldOut}
                  color={isSoldOut ? '#555' : undefined}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
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
  // 完売時の背景微調整
  ticketItemSoldOut: {
    opacity: 0.8,
  },
  ticketName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  ticketPrice: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 5,
    fontWeight: 'bold',
  },
  ticketCapacity: { fontSize: 12, color: '#888', marginTop: 2 },
  soldOutText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  buttonGroup: { flexDirection: 'row', marginLeft: 10 },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
});

export default TicketPurchaseList;