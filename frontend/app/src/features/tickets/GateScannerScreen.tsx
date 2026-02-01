import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';

// カスタムフック & コンポーネント
import { useGateScanner } from '../../hooks/useGateScanner';
import { ScannerModeSelector } from './components/ScannerModeSelector';
import { ScannerGuide } from './components/ScannerGuide';
import { ScanResultOverlay } from './components/ScanResultOverlay';

type ScannerScreenRouteProp = RouteProp<MyPageStackParamList, 'Scan'>;

export default function GateScannerScreen() {
  const isFocused = useIsFocused();
  const route = useRoute<ScannerScreenRouteProp>();

  // ロジック呼び出し
  const {
    device,
    hasPermission,
    scanState,
    scanMode, // 内部的には常に 'ticket' となる
    resultMessage,
    ticketInfo,
    resetScanner,
    openSettings,
    codeScanner,
  } = useGateScanner({ initialMode: 'ticket' });

  // 画面テキスト定義
  const uiTexts = {
    ticket: {
      instruction: '入場チケットのQRコードを\n枠内に合わせてください',
      successHeader: '入場OK',
    },
  };

  // 権限/デバイスエラー処理
  if (device == null || !hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>
          {device ? 'カメラの権限が必要です' : 'カメラデバイスが見つかりません'}
        </Text>
        {hasPermission === false && (
          <Text style={styles.link} onPress={openSettings}>
            設定を開く
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. カメラレイヤー */}
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
          enableZoomGesture={true}
        />
      )}

      {/* 2. UIオーバーレイレイヤー */}
      <View style={styles.overlay}>
        {/* スキャン枠 (アイドル時のみ) */}
        {scanState === 'idle' && (
          <ScannerGuide instruction={uiTexts.ticket.instruction} />
        )}

        {/* 結果表示オーバーレイ (処理中/成功/エラー) */}
        <ScanResultOverlay
          state={scanState}
          headerText={uiTexts.ticket.successHeader}
          message={resultMessage}
          subMessage={ticketInfo}
          onReset={resetScanner}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionText: { color: '#FFF', fontSize: 16, marginBottom: 10 },
  link: { color: '#4DA6FF', fontSize: 16 },
});
