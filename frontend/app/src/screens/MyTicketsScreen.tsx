import React, { useEffect } from 'react'; // 1. ★ useState, useCallback, useFocusEffect を削除
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  // Alert, // 2. ★ Alert は useQuery のエラー処理に任せる (または別途エラー表示)
} from 'react-native';
// 3. ★ useFocusEffect を削除
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
// 4. ★ api.ts は不要 (queries.ts が使う)
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

// 5. ★ React Query をインポート
import { useQuery, useQueryClient } from '@tanstack/react-query';
// 6. ★ queries.ts から型と関数をインポート
import { UserTicket, fetchMyTickets } from '../api/queries';

const MyTicketsScreen: React.FC = () => {
  // 7. ★ useState(myTickets), useState(loading) を削除

  // 8. ★ QueryClient を取得 (キャッシュを直接更新するため)
  const queryClient = useQueryClient();

  // 9. ★ (NEW) React Query で /my-tickets を取得
  const myTicketsQueryKey = ['myTickets']; // キャッシュキー
  const {
    data: myTickets, // 取得したデータ (UserTicket[] | undefined)
    isLoading, // 初回ロード中 (キャッシュがない場合)
    isError, // エラー発生時
  } = useQuery({
    queryKey: myTicketsQueryKey,
    queryFn: fetchMyTickets,
    staleTime: 1000 * 60 * 3, // 3分間はキャッシュを優先
  });

  // 10. ★ (DELETE) useFocusEffect を削除
  // (useQuery がキャッシュ管理と 'refetchOnWindowFocus' を自動で行うため)

  // 11. ★ (MODIFY) Firestore リアルタイムリスナー
  useEffect(() => {
    // 11-a. myTickets が取得できるまで待つ
    // (isLoading や myTickets が undefined の場合は何もしない)
    if (!myTickets || myTickets.length === 0) {
      return;
    }

    const unsubscribers: (() => void)[] = [];

    myTickets.forEach(ticket => {
      if (ticket.is_used || !ticket.qr_code_id) {
        return;
      }

      const docRef = firestore()
        .collection('ticket_status')
        .doc(ticket.qr_code_id);

      const unsubscribe = docRef.onSnapshot(
        (snapshot: FirebaseFirestoreTypes.DocumentSnapshot) => {
          if (snapshot.exists() && snapshot.data()?.status === 'used') {
            console.log(`チケット ${ticket.id} がスキャンされました！`);

            // 11-b. ★★★ (IMPORTANT) ★★★
            // useState(setMyTickets) の代わりに、
            // React Query のキャッシュ (setQueryData) を "直接" 更新する
            queryClient.setQueryData(
              myTicketsQueryKey,
              (oldData: UserTicket[] | undefined) => {
                // キャッシュ (oldData) がなければ何もしない
                if (!oldData) {
                  return [];
                }
                // キャッシュ (oldData) を見に行き、該当チケットの is_used を true に書き換える
                return oldData.map(t =>
                  t.id === ticket.id ? { ...t, is_used: true } : t,
                );
              },
            );
          }
        },
        error => {
          console.error(`Failed to listen to ticket ${ticket.id}:`, error);
        },
      );

      unsubscribers.push(unsubscribe);
    });

    // 11-c. クリーンアップ (変更なし)
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [myTickets, queryClient]); // 12. ★ 依存配列に myTickets と queryClient を指定

  // --- (ここから下は、ほぼ変更なし) ---

  // 13. ★ renderItem は変更なし
  const renderItem = ({ item }: { item: UserTicket }) => (
    <View style={[styles.ticketItem, item.is_used && styles.ticketItemUsed]}>
      <View style={styles.ticketInfo}>
        {item.is_used && <Text style={styles.usedLabel}>[使用済み]</Text>}
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
        {item.is_used ? (
          <View style={styles.usedContainer}>
            <Text style={styles.usedIcon}>✅</Text>
            <Text style={styles.usedText}>入場OK</Text>
          </View>
        ) : item.qr_code_id ? (
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
      {/* 14. ★ ローディング判定を 'isLoading' に変更 */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        // 15. ★ エラー表示
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>チケットの取得に失敗しました。</Text>
        </View>
      ) : !myTickets || myTickets.length === 0 ? (
        // 16. ★ 空の表示 (myTickets が undefined の場合も考慮)
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>購入済みのチケットはありません</Text>
        </View>
      ) : (
        <FlatList
          data={myTickets} // 17. ★ useQuery の data をそのまま使用
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
        />
      )}
    </SafeAreaView>
  );
};

// --- スタイルシート (一部追加) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 10,
  },
  // 18. ★ (NEW) 中央配置用のスタイル
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  ticketItemUsed: {
    backgroundColor: '#1C1C1E',
    borderColor: '#34C759',
  },
  ticketInfo: {
    flex: 1,
    marginRight: 10,
  },
  usedLabel: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
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
    width: 90,
    height: 90,
    padding: 5,
    backgroundColor: 'white',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noQrText: {
    color: '#000000',
    fontSize: 12,
  },
  usedContainer: {
    backgroundColor: 'white',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usedIcon: {
    fontSize: 30,
  },
  usedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: 'bold',
    marginTop: 5,
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
  },
});

export default MyTicketsScreen;
