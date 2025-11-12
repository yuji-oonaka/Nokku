import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg'; // 👈 1. QRコードライブラリをインポート
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

// 型定義 (DBの関連付け(with)と合わせる)
interface UserTicket {
  id: number;
  seat_number: string; // "S席-1" や "自由席-10"
  qr_code_id: string; // QRコード生成用のUUID
  is_used: boolean;
  event: {
    // 'with'で読み込んだイベント情報
    title: string;
    venue: string;
    event_date: string;
  };
  ticket_type: {
    // 'with'で読み込んだ券種情報
    name: string; // "S席"
  };
}

const MyTicketsScreen: React.FC = () => {
  const [myTickets, setMyTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // 画面にフォーカスが当たるたびに、購入済みチケット一覧を取得
  useFocusEffect(
    useCallback(() => {
      const fetchMyTickets = async () => {
        try {
          setLoading(true);
          // 5. ★ fetch(...) を api.get(...) に置き換え
          // api.ts が自動で baseURL と Auth ヘッダーを付与します
          const response = await api.get<UserTicket[]>('/my-tickets');

          // 6. ★ response.ok チェックは不要 (api.tsがエラーを自動で catch に投げるため)
          // 7. ★ データは response.data に入っています
          setMyTickets(response.data);
        } catch (error: any) {
          Alert.alert(
            'エラー',
            error.message || 'マイチケットの取得に失敗しました',
          );
        } finally {
          setLoading(false);
        }
      };

      fetchMyTickets();
    }, []), // 8. ★ 依存配列から authToken を削除 (空の配列にする)
  );

  // リストの各アイテム（チケット）
  const renderItem = ({ item }: { item: UserTicket }) => (
    <View style={styles.ticketItem}>
      <View style={styles.ticketInfo}>
        <Text style={styles.eventTitle}>{item.event.title}</Text>
        <Text style={styles.ticketDetail}>
          {item.ticket_type.name} / {item.seat_number}
        </Text>
        <Text style={styles.ticketDetail}>{item.event.venue}</Text>
        <Text style={styles.ticketDetail}>
          {new Date(item.event.event_date).toLocaleString('ja-JP')}
        </Text>
      </View>
      <View style={styles.qrContainer}>
        {/* 👈 3. qr_code_id を使ってQRコードを生成 */}
        {item.qr_code_id ? (
          <QRCode
            value={item.qr_code_id}
            size={80}
            backgroundColor="white"
            color="black"
          />
        ) : (
          <Text style={styles.noQrText}>QRなし</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" />
      ) : myTickets.length === 0 ? (
        <Text style={styles.emptyText}>購入済みのチケットはありません</Text>
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

// --- スタイルシート ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 10,
  },
  ticketItem: {
    backgroundColor: '#222',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketInfo: {
    flex: 1,
    marginRight: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  ticketDetail: {
    fontSize: 16,
    color: '#BBBBBB',
    marginBottom: 3,
  },
  qrContainer: {
    padding: 5,
    backgroundColor: 'white', // QRコードの背景
    borderRadius: 4,
  },
  noQrText: {
    color: '#000000',
    fontSize: 12,
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
});

export default MyTicketsScreen;
