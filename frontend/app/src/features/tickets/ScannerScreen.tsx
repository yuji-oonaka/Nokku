import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';

// ★ 作成済みのHookとコンポーネントを読み込む（これがリファクタリングの肝です）
import { useGateScanner } from '../../hooks/useGateScanner';
import { ScannerModeSelector } from './components/ScannerModeSelector';
import { ScannerGuide } from './components/ScannerGuide';
import { ScanResultOverlay } from './components/ScanResultOverlay';

type ScannerScreenRouteProp = RouteProp<MyPageStackParamList, 'Scan'>;

export default function ScannerScreen() {
  const isFocused = useIsFocused();
  const route = useRoute<ScannerScreenRouteProp>();

  // ★ Logic: useGateScannerフックを使うことで、約100行のロジックを削除
  const {
    device,
    hasPermission,
    scanState,
    scanMode,
    resultMessage,
    ticketInfo,
    setScanMode,
    resetScanner,
    openSettings,
    codeScanner,
  } = useGateScanner({ initialMode: route.params?.scanMode });

  // 画面表示テキスト定義
  const uiTexts = {
    ticket: {
      instruction: '入場チケットのQRコードを\n枠内に合わせてください',
      successHeader: '入場OK',
    },
    order: {
      instruction: '注文詳細のQRコードを\n枠内に合わせてください',
      successHeader: '引換完了',
    },
  };

  // 権限・デバイスチェック
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
        {/* モード切替 (共通コンポーネント) */}
        <ScannerModeSelector
          currentMode={scanMode}
          onModeChange={setScanMode}
          disabled={scanState !== 'idle'}
        />

        {/* ガイド枠 (共通コンポーネント) */}
        {scanState === 'idle' && (
          <ScannerGuide instruction={uiTexts[scanMode].instruction} />
        )}

        {/* 結果表示 (共通コンポーネント) */}
        <ScanResultOverlay
          state={scanState}
          headerText={uiTexts[scanMode].successHeader}
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
