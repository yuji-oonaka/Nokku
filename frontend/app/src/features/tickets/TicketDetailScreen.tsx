import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';
import SoundService from '../services/SoundService';
import { useQueryClient } from '@tanstack/react-query';
import { UserTicket } from '../api/queries';

type TicketDetailRouteProp = RouteProp<MyPageStackParamList, 'TicketDetail'>;

const TicketDetailScreen: React.FC = () => {
  const route = useRoute<TicketDetailRouteProp>();
  const { ticket: initialTicket } = route.params;
  const queryClient = useQueryClient();

  // ローカルで状態管理 (リアルタイム更新用)
  const [ticket, setTicket] = useState<UserTicket>(initialTicket);

  // 日付判定 (イベント翌日以降か？)
  const eventDate = new Date(ticket.event.event_date);
  const now = new Date();
  // 簡易判定: イベント開始時刻の24時間後を「終了」とする
  const isEventFinished =
    now.getTime() > eventDate.getTime() + 24 * 60 * 60 * 1000;

  // Firestore リアルタイム監視
  useEffect(() => {
    // 既に使用済み、またはQRコードがない場合は監視しない
    if (ticket.is_used || !ticket.qr_code_id) return;

    const unsubscribe = firestore()
      .collection('ticket_status')
      .doc(ticket.qr_code_id)
      .onSnapshot(snapshot => {
        const data = snapshot.data();
        if (data?.status === 'used') {
          // ★ 入場成功！
          SoundService.playSuccess();

          // UI更新
          setTicket(prev => ({ ...prev, is_used: true }));

          // キャッシュ更新 (戻った時にリストも更新されるように)
          queryClient.invalidateQueries({ queryKey: ['myTickets'] });

          Alert.alert('入場確認', '認証が完了しました！楽しんでください！');
        }
      });

    return () => unsubscribe();
  }, [ticket.qr_code_id, ticket.is_used, queryClient]);

  // --- 表示コンテンツの出し分け ---
  const renderTicketStatus = () => {
    // A: イベント終了後 -> Thank You
    if (isEventFinished) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.thankYouTitle}>THANK YOU!</Text>
          <Text style={styles.thankYouText}>イベントは終了しました。</Text>
          <Text style={styles.thankYouText}>
            ご来場ありがとうございました。
          </Text>
        </View>
      );
    }

    // B: 入場済み -> 入場OK
    if (ticket.is_used) {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✔</Text>
          </View>
          <Text style={styles.entryOkText}>入場済み</Text>
          <Text style={styles.entryOkSubText}>
            再入場の際はスタッフへ提示してください
          </Text>
        </View>
      );
    }

    // C: 入場前 -> QRコード
    return (
      <View style={styles.qrContainer}>
        <Text style={styles.qrLabel}>入場用QRコード</Text>
        {ticket.qr_code_id ? (
          <QRCode
            value={ticket.qr_code_id}
            size={220}
            backgroundColor="white"
            color="black"
          />
        ) : (
          <Text style={styles.errorText}>QRコード情報がありません</Text>
        )}
        <Text style={styles.qrNote}>入場ゲートにかざしてください</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* イベント情報カード */}
        <View style={styles.card}>
          <Text style={styles.eventTitle}>{ticket.event.title}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>日時:</Text>
            <Text style={styles.value}>
              {new Date(ticket.event.event_date).toLocaleString('ja-JP')}
            </Text>
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

        {/* ステータス表示エリア (QR / OK / ThankYou) */}
        <View style={styles.mainStatusArea}>{renderTicketStatus()}</View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { padding: 20, alignItems: 'center' },

  // カードスタイル
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

  // ステータスエリア
  mainStatusArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
  },

  // QRコード
  qrContainer: { alignItems: 'center' },
  qrLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  qrNote: { fontSize: 14, color: '#666', marginTop: 20 },
  errorText: { color: 'red' },

  // 入場済み
  statusContainer: { alignItems: 'center' },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkIcon: { fontSize: 50, color: '#FFF' },
  entryOkText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 10,
  },
  entryOkSubText: { fontSize: 14, color: '#666', textAlign: 'center' },

  // Thank You
  thankYouTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  thankYouText: { fontSize: 16, color: '#444', marginBottom: 5 },
});

export default TicketDetailScreen;
