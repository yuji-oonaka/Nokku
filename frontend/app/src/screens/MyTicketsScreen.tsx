import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity, // ★ View -> TouchableOpacity に変更
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';
import { useQuery } from '@tanstack/react-query';
import { UserTicket, fetchMyTickets } from '../api/queries';

type MyTicketsNavigationProp = StackNavigationProp<
  MyPageStackParamList,
  'MyTickets'
>;

const MyTicketsScreen: React.FC = () => {
  const navigation = useNavigation<MyTicketsNavigationProp>();

  const {
    data: myTickets,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['myTickets'],
    queryFn: fetchMyTickets,
    staleTime: 1000 * 60 * 3,
  });

  // 詳細へ遷移
  const handlePressTicket = (ticket: UserTicket) => {
    navigation.navigate('TicketDetail', { ticket });
  };

  const renderItem = ({ item }: { item: UserTicket }) => {
    // 日付判定 (終了バッジ用)
    const eventDate = new Date(item.event.event_date);
    const now = new Date();
    const isFinished =
      now.getTime() > eventDate.getTime() + 24 * 60 * 60 * 1000;

    return (
      <TouchableOpacity
        style={[styles.ticketItem, item.is_used && styles.ticketItemUsed]}
        onPress={() => handlePressTicket(item)}
        activeOpacity={0.7}
      >
        <View style={styles.ticketInfo}>
          {/* ステータスバッジ */}
          <View style={styles.statusBadgeRow}>
            {isFinished ? (
              <Text style={styles.badgeFinished}>終了</Text>
            ) : item.is_used ? (
              <Text style={styles.badgeUsed}>入場済み</Text>
            ) : (
              <Text style={styles.badgeUnused}>未使用</Text>
            )}
          </View>

          <Text style={styles.eventTitle}>{item.event.title}</Text>
          <Text style={styles.ticketDetail}>
            {item.ticket_type.name} / {item.seat_number}
          </Text>
          <Text style={styles.ticketDetail}>{item.event.venue}</Text>
          <Text style={styles.ticketDetail}>
            {new Date(item.event.event_date).toLocaleString('ja-JP')}
          </Text>
        </View>

        {/* 右端の矢印 */}
        <View style={styles.rightIcon}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>チケットの取得に失敗しました。</Text>
        </View>
      ) : !myTickets || myTickets.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>購入済みのチケットはありません</Text>
        </View>
      ) : (
        <FlatList
          data={myTickets}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
  },
});

export default MyTicketsScreen;
