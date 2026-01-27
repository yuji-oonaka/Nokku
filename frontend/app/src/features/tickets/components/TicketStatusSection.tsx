import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { UserTicket } from '../../../api/queries';
import { SecurityClock } from './SecurityClock';
import { BlinkingIndicator } from './BlinkingIndicator';

interface Props {
  ticket: UserTicket;
  isEventFinished: boolean;
}

export const TicketStatusSection: React.FC<Props> = ({
  ticket,
  isEventFinished,
}) => {
  // A: イベント終了後
  if (isEventFinished) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.thankYouTitle}>THANK YOU!</Text>
        <Text style={styles.thankYouText}>イベントは終了しました。</Text>
        <Text style={styles.thankYouText}>ご来場ありがとうございました。</Text>
      </View>
    );
  }

  /**
   * B: 入場済み
   *  ticket.is_used を廃止し、status で判定するように修正
   */
  if (ticket.status === 'used') {
    return (
      <View style={styles.statusContainer}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkIcon}>✔</Text>
        </View>
        <Text style={styles.entryOkText}>入場済み</Text>
        <Text style={styles.entryOkSubText}>
          再入場の際はスタッフへ提示してください
        </Text>
        <SecurityClock />
      </View>
    );
  }

  // C: 入場前 (QR表示) - status が 'valid' の状態
  return (
    <View style={styles.qrContainer}>
      <Text style={styles.qrLabel}>入場用QRコード</Text>
      <BlinkingIndicator />

      {ticket.qr_code_id ? (
        <View style={styles.qrWrapper}>
          <QRCode
            value={ticket.qr_code_id}
            size={220}
            backgroundColor="white"
            color="black"
          />
        </View>
      ) : (
        <Text style={styles.errorText}>QRコード情報がありません</Text>
      )}

      <View style={styles.idContainer}>
        <Text style={styles.idLabel}>Ticket ID (手入力用)</Text>
        <Text style={styles.idValue}>#{ticket.id}</Text>
      </View>

      <SecurityClock />
      <Text style={styles.qrNote}>入場ゲートにかざしてください</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Status Container
  statusContainer: { alignItems: 'center', width: '100%' },

  // QR Style
  qrContainer: { alignItems: 'center', width: '100%' },
  qrLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  qrWrapper: { padding: 5, backgroundColor: '#fff' },
  qrNote: { fontSize: 14, color: '#666', marginTop: 15 },
  errorText: { color: 'red' },

  // Used Style
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
  entryOkSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Finished Style
  thankYouTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  thankYouText: { fontSize: 16, color: '#444', marginBottom: 5 },

  idContainer: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    width: '100%',
  },
  idLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  idValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace', // 数字の読み間違い防止
    letterSpacing: 2,
  },
});
