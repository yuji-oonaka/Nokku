import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ScanState } from '../../../hooks/useGateScanner';

interface Props {
  state: ScanState;
  headerText: string; // "入場OK" や "引き換え完了" など
  message: string; // APIからのメッセージ ("引き換え成功！" など)
  subMessage?: string; // チケット情報や商品サマリー
  onReset: () => void;
  // ★ 追加: 現金決済用の Props
  isCashPayment?: boolean;
  onConfirmCash?: () => void;
}

export const ScanResultOverlay: React.FC<Props> = ({
  state,
  headerText,
  message,
  subMessage,
  onReset,
  isCashPayment,
  onConfirmCash,
}) => {
  if (state === 'idle') return null;

  // 照合中の表示
  if (state === 'processing') {
    return (
      <View style={styles.centerOverlay}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.statusText}>照合中...</Text>
      </View>
    );
  }

  const isSuccess = state === 'success';
  const bgColor = isSuccess
    ? 'rgba(40, 205, 65, 0.95)' // 成功: 緑
    : 'rgba(255, 59, 48, 0.95)'; // エラー: 赤

  return (
    <TouchableOpacity
      style={[styles.resultOverlay, { backgroundColor: bgColor }]}
      activeOpacity={0.9}
      // 成功時、かつ現金決済待ちでない場合は自動で閉じるためタップ無効
      // エラー時、または現金決済待機中はタップでリセット（キャンセル）できるようにする
      onPress={isSuccess && !isCashPayment ? undefined : onReset}
      disabled={isSuccess && !isCashPayment}
    >
      <Text style={styles.iconLarge}>{isSuccess ? '✅' : '⚠️'}</Text>
      <Text style={styles.resultHeader}>
        {isSuccess ? headerText : 'エラー'}
      </Text>

      {/* メインメッセージ (サマリーがあればそれを優先表示) */}
      <Text style={styles.resultMessage}>{subMessage || message}</Text>

      {/* 成功時の詳細表示 (サマリーがある場合の補足) */}
      {isSuccess && subMessage && (
        <Text style={styles.resultSubMessage}>{message}</Text>
      )}

      {/* ★ 現金決済確定ボタン: 成功かつ現金払い待ちの場合のみ表示 */}
      {isSuccess && isCashPayment && (
        <TouchableOpacity
          style={styles.confirmCashButton}
          onPress={onConfirmCash}
        >
          <Text style={styles.confirmCashButtonText}>💰 代金受取・確定</Text>
        </TouchableOpacity>
      )}

      {/* エラー時のみ詳細メッセージとリセット案内を表示 */}
      {!isSuccess && (
        <>
          {subMessage ? (
            <Text style={styles.resultSubMessage}>{message}</Text>
          ) : null}
          <View style={styles.retryButton}>
            <Text style={styles.retryText}>タップして次へ</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  statusText: {
    color: 'white',
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconLarge: { fontSize: 80, marginBottom: 10 },
  resultHeader: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  resultMessage: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultSubMessage: {
    fontSize: 16,
    color: '#EEE',
    textAlign: 'center',
    marginBottom: 20,
  },
  // ★ 現金確定ボタンのスタイル
  confirmCashButton: {
    backgroundColor: 'white',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 40,
    marginTop: 20,
    // 影をつけてボタンであることを強調
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  confirmCashButtonText: {
    color: '#28CD41', // 成功カラーと同じ緑
    fontSize: 20,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 20,
  },
  retryText: { color: 'black', fontWeight: 'bold' },
});
