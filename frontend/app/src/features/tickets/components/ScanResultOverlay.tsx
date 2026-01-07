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
  headerText: string; // "入場OK" など
  message: string;
  subMessage?: string;
  onReset: () => void;
}

export const ScanResultOverlay: React.FC<Props> = ({
  state,
  headerText,
  message,
  subMessage,
  onReset,
}) => {
  if (state === 'idle') return null;

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
    ? 'rgba(40, 205, 65, 0.95)'
    : 'rgba(255, 59, 48, 0.95)';

  return (
    <TouchableOpacity
      style={[styles.resultOverlay, { backgroundColor: bgColor }]}
      activeOpacity={0.9}
      onPress={isSuccess ? undefined : onReset} // 成功時はタップ無効（自動で消える）、エラー時はタップで消す
      disabled={isSuccess}
    >
      <Text style={styles.iconLarge}>{isSuccess ? '✅' : '⚠️'}</Text>
      <Text style={styles.resultHeader}>
        {isSuccess ? headerText : 'エラー'}
      </Text>
      <Text style={styles.resultMessage}>{subMessage || message}</Text>

      {/* エラー時のみ詳細メッセージとボタンを表示 */}
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

      {/* 成功時のサブメッセージ */}
      {isSuccess && subMessage && (
        <Text style={styles.resultSubMessage}>{message}</Text>
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
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 20,
  },
  retryText: { color: 'black', fontWeight: 'bold' },
});
