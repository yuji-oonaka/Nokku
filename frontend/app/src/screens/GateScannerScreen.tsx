import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

// スキャン結果の状態を定義
type ScanResult = 'idle' | 'scanning' | 'success' | 'error';

const GateScannerScreen = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const isFocused = useIsFocused(); // 画面がフォーカスされているか

  const [scanState, setScanState] = useState<ScanResult>('idle');
  const [message, setMessage] = useState(''); // 表示するメッセージ

  // 1. カメラ権限のリクエスト
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // 2. スキャン処理
  const handleScan = useCallback(
    async (qrCodeId: string) => {
      // 既に処理中、または結果表示中はスキャンしない
      if (scanState !== 'idle') return;

      setScanState('scanning');

      try {
        // APIを呼び出し (既存のAPIを流用)
        const response = await api.post('/tickets/scan', {
          qr_code_id: qrCodeId,
        });

        // 成功 (200 OK)
        setScanState('success');
        setMessage(response.data.message || '入場OKです。');
      } catch (error: any) {
        // 失敗 (409: 使用済み, 404: 不正, 403: 権限なし)
        setScanState('error');
        if (error.response) {
          setMessage(error.response.data.message || '無効なチケットです。');
        } else {
          setMessage('ネットワークエラーが発生しました。');
        }
      } finally {
        // 3. ★ 3秒後に自動でアイドル状態に戻る
        setTimeout(() => {
          setScanState('idle');
          setMessage('');
        }, 3000);
      }
    },
    [scanState],
  ); // scanState が 'idle' に戻るまで handleScan を再生成しない

  // 4. QRコードスキャナーの設定
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (scanState === 'idle' && codes.length > 0 && codes[0].value) {
        handleScan(codes[0].value);
      }
    },
  });

  // 5. 権限やデバイスがない場合の表示
  if (!hasPermission || !device) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.messageText}>
          {hasPermission
            ? 'カメラデバイスが見つかりません'
            : 'カメラ権限がありません'}
        </Text>
      </SafeAreaView>
    );
  }

  // 6. メインのJSX
  return (
    <SafeAreaView style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        // ★ 画面フォーカス中、かつアイドル状態の時のみカメラを起動
        isActive={isFocused && scanState === 'idle'}
        codeScanner={codeScanner}
        enableZoomGesture={true}
      />

      {/* --- プロンプト表示 (アイドル時) --- */}
      {scanState === 'idle' && (
        <View style={styles.promptContainer}>
          <Text style={styles.promptText}>QRコードをかざしてください</Text>
        </View>
      )}

      {/* --- 結果表示 (成功/エラー時) --- */}
      {scanState === 'success' && (
        <View style={[styles.overlay, styles.successOverlay]}>
          <Text style={styles.resultText}>✅</Text>
          <Text style={styles.resultText}>入場OK</Text>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {scanState === 'error' && (
        <View style={[styles.overlay, styles.errorOverlay]}>
          <Text style={styles.resultText}>❌</Text>
          <Text style={styles.resultText}>エラー</Text>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {/* --- スキャン中 (一瞬) --- */}
      {scanState === 'scanning' && (
        <View style={[styles.overlay, styles.scanningOverlay]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </SafeAreaView>
  );
};

// 7. ★ スタイル
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  promptText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 10,
  },
  // --- オーバーレイ ---
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlay: {
    backgroundColor: 'rgba(10, 132, 255, 0.8)', // iOS Blue (Success)
  },
  errorOverlay: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)', // iOS Red (Error)
  },
  scanningOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  resultText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default GateScannerScreen;
