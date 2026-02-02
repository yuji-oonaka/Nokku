import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';

// ★ 作成済みのHookとコンポーネントを読み込む（これがリファクタリングの肝です）
import { useGateScanner } from '../../hooks/useGateScanner';
import { ScannerModeSelector } from './components/ScannerModeSelector';
import { ScannerGuide } from './components/ScannerGuide';
import { ScanResultOverlay } from './components/ScanResultOverlay';
import { ManualEntryModal } from './components/ManualEntryModal';

type ScannerScreenRouteProp = RouteProp<MyPageStackParamList, 'Scan'>;

export default function ScannerScreen() {
  const isFocused = useIsFocused();
  const route = useRoute<ScannerScreenRouteProp>();
  const [isManualModalVisible, setManualModalVisible] = useState(false);

  // ★ Logic: useGateScannerフックを使うことで、約100行のロジックを削除
  const {
    device,
    hasPermission,
    scanState,
    scanMode,
    resultMessage,
    ticketInfo,
    isCashPaymentRequired,
    confirmCashPayment,
    setScanMode,
    resetScanner,
    openSettings,
    codeScanner,
    executeManualEntry,
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
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
          enableZoomGesture={true}
        />
      )}

      <View style={styles.overlay}>
        <ScannerModeSelector
          currentMode={scanMode}
          onModeChange={setScanMode}
          disabled={scanState !== 'idle'}
        />

        {scanState === 'idle' && (
          <>
            <ScannerGuide instruction={uiTexts[scanMode].instruction} />

            {/* ★ 追加: 手入力ボタン (スキャン枠の下に配置) */}
            {scanMode === 'ticket' && (
              <TouchableOpacity
                style={styles.manualButton}
                onPress={() => setManualModalVisible(true)}
              >
                <Text style={styles.manualButtonText}>🔢 ID手入力</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <ScanResultOverlay
          state={scanState}
          // ★ 修正: 現金払いの場合はヘッダーを「現金決済待ち」に変更
          headerText={
            isCashPaymentRequired
              ? '現金決済待ち'
              : uiTexts[scanMode].successHeader
          }
          message={resultMessage}
          subMessage={ticketInfo}
          onReset={resetScanner}
          // ★ 追加: Overlayにプロップスを渡す
          isCashPayment={isCashPaymentRequired}
          onConfirmCash={confirmCashPayment}
        />

        {/* ★ 追加: モーダル */}
        <ManualEntryModal
          visible={isManualModalVisible}
          onClose={() => setManualModalVisible(false)}
          onSubmit={executeManualEntry}
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

  manualButton: {
    position: 'absolute',
    bottom: 80, // 画面下部
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  manualButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
