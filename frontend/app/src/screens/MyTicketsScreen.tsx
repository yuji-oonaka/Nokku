import React, { useState, useCallback, useEffect } from 'react';
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
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';



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

  // 4. ★★★ (NEW) Firestore リアルタイムリスナー ★★★
  useEffect(() => {
    // myTickets がAPIから読み込まれるまで待つ
    if (myTickets.length === 0) {
      return;
    }

    // 購読を解除するための関数を格納する配列
    const unsubscribers: (() => void)[] = [];

    // ユーザーが持っているチケット（未使用のもの）だけを購読
    myTickets.forEach(ticket => {
      // 既に 'is_used' が true のチケットは購読する必要がない
      if (ticket.is_used || !ticket.qr_code_id) {
        return;
      }

      // 'ticket_status/{qr_code_id}' ドキュメントを購読
      const docRef = firestore()
        .collection('ticket_status')
        .doc(ticket.qr_code_id);

      const unsubscribe = docRef.onSnapshot(
        (snapshot: FirebaseFirestoreTypes.DocumentSnapshot) => {
          if (snapshot.exists() && snapshot.data()?.status === 'used') {
            console.log(`チケット ${ticket.id} がスキャンされました！`);
            setMyTickets(prevTickets =>
              prevTickets.map(t =>
                t.id === ticket.id ? { ...t, is_used: true } : t,
              ),
            );
          }
        },
        error => {
          console.error(`Failed to listen to ticket ${ticket.id}:`, error);
        },
      );

      // ← ★ここを修正
      unsubscribers.push(unsubscribe);
    });

    // 6. ★ クリーンアップ関数
    // 画面を離れるか、myTickets が変更されたら、すべての購読を解除
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [myTickets]); // myTickets リストが更新されたらリスナーを再設定

  // リストの各アイテム（チケット）
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
          // --- (A) 使用済みの場合 ---
          <View style={styles.usedContainer}>
            <Text style={styles.usedIcon}>✅</Text>
            <Text style={styles.usedText}>入場OK</Text>
          </View>
        ) : item.qr_code_id ? (
          // --- (B) 未使用 (QRあり) の場合 ---
          <QRCode
            value={item.qr_code_id}
            size={80}
            backgroundColor="white"
            color="black"
          />
        ) : (
          // --- (C) QRなし (エラーなど) ---
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
  ticketItemUsed: {
    backgroundColor: '#1C1C1E', // 少し暗く
    borderColor: '#34C759', // 緑色の枠線
  },
  ticketInfo: {
    flex: 1,
    marginRight: 10,
  },
  usedLabel: {
    color: '#34C759', // 緑色
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
    width: 90, // 13. ★ サイズを固定 (QR/使用済み)
    height: 90, //
    padding: 5,
    backgroundColor: 'white',
    borderRadius: 4,
    justifyContent: 'center', // 14. ★ 中身を中央揃え
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
    marginTop: 50,
    fontSize: 18,
  },
});

export default MyTicketsScreen;
