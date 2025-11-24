import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import api from '../services/api';
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';
import SoundService from '../services/SoundService';

type ScannerScreenRouteProp = RouteProp<MyPageStackParamList, 'Scan'>;
type ScanMode = 'ticket' | 'order';

// アイコン代わりのコンポーネント
const TabIcon = ({ name, active }: { name: string; active: boolean }) => (
  <Text
    style={{ color: active ? '#FFF' : '#CCC', fontSize: 20, marginRight: 8 }}
  >
    {name === 'ticket' ? '🎫' : '🛍️'}
  </Text>
);

export default function ScannerScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const isFocused = useIsFocused();
  const route = useRoute<ScannerScreenRouteProp>();

  // 処理中フラグ
  const [isProcessing, setIsProcessing] = useState(false);

  // 初期モードはナビゲーションパラメータから取得、なければ 'ticket'
  const [scanMode, setScanMode] = useState<ScanMode>(
    route.params?.scanMode || 'ticket',
  );

  // 最後にスキャンしたコードと時間を記録して、短時間の重複スキャンを防ぐ
  const lastScanned = useRef<{ code: string; time: number } | null>(null);

  const uiTexts = {
    ticket: {
      title: 'チケット入場スキャン',
      loading: '認証中...',
      successTitle: '認証成功',
      instruction: '入場チケットのQRコードを\n枠内に合わせてください',
    },
    order: {
      title: 'グッズ引換スキャン',
      loading: '処理中...',
      successTitle: '引換完了',
      instruction: '注文詳細のQRコードを\n枠内に合わせてください',
    },
  };

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // スキャン成功時の処理
  const onCodeScanned = async (codes: any[]) => {
    if (isProcessing || codes.length === 0) return;
    const codeValue = codes[0]?.value;
    if (!codeValue) return;

    // 重複スキャン防止 (2秒以内は同じコードを無視)
    const now = Date.now();
    if (
      lastScanned.current &&
      lastScanned.current.code === codeValue &&
      now - lastScanned.current.time < 2000
    ) {
      return;
    }
    lastScanned.current = { code: codeValue, time: now };

    setIsProcessing(true);
    // 手ごたえとしての軽い振動
    SoundService.triggerHaptic('impactMedium');
    console.log(`Scanned code (${scanMode}):`, codeValue);

    try {
      let endpoint = '';
      let successMessagePrefix = '';

      if (scanMode === 'ticket') {
        endpoint = '/tickets/scan';
        successMessagePrefix = 'チケットを使用済みにしました。';
      } else if (scanMode === 'order') {
        endpoint = '/orders/redeem';
        successMessagePrefix = '商品の引き換えが完了しました。';
      }

      const response = await api.post(endpoint, {
        qr_code_id: codeValue,
      });

      // 成功時の音と振動
      SoundService.playSuccess();

      Alert.alert(
        uiTexts[scanMode].successTitle,
        response.data.message || successMessagePrefix,
        [{ text: 'OK', onPress: () => setIsProcessing(false) }],
        { cancelable: false },
      );
    } catch (error: any) {
      // 失敗時の音と振動
      SoundService.playError();

      let errorMessage = '不明なエラーが発生しました。';

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (errorMessage === 'Network Error') {
        errorMessage =
          '通信エラーが発生しました。サーバーの状態を確認してください。';
      }

      Alert.alert(
        'エラー',
        errorMessage,
        [{ text: 'OK', onPress: () => setIsProcessing(false) }],
        { cancelable: false },
      );
    }
    // finally で setIsProcessing(false) しないのは、アラートのOKを押すまでスキャンを止めるため
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: onCodeScanned,
  });

  if (device == null) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>
          カメラデバイスが見つかりません
        </Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>カメラの権限が必要です</Text>
        <Text style={styles.link} onPress={() => Linking.openSettings()}>
          設定を開く
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* カメラビュー */}
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!isProcessing} // 処理中はカメラを一時停止しても良い
          codeScanner={codeScanner}
          enableZoomGesture={true}
        />
      )}

      {/* オーバーレイUI */}
      <View style={styles.overlay}>
        {/* モード切替タブ */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              scanMode === 'ticket' && styles.activeMode,
            ]}
            onPress={() => setScanMode('ticket')}
            disabled={isProcessing}
          >
            <TabIcon name="ticket" active={scanMode === 'ticket'} />
            <Text
              style={[
                styles.modeText,
                scanMode === 'ticket' && styles.activeModeText,
              ]}
            >
              チケット入場
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              scanMode === 'order' && styles.activeMode,
            ]}
            onPress={() => setScanMode('order')}
            disabled={isProcessing}
          >
            <TabIcon name="product" active={scanMode === 'order'} />
            <Text
              style={[
                styles.modeText,
                scanMode === 'order' && styles.activeModeText,
              ]}
            >
              グッズ引換
            </Text>
          </TouchableOpacity>
        </View>

        {/* スキャン枠ガイド */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
            {/* 処理中インジケータ (枠の中に出す) */}
            {isProcessing && (
              <View style={styles.loadingInFrame}>
                <ActivityIndicator size="large" color="#7C4DFF" />
              </View>
            )}
          </View>
          <Text style={styles.scanInstruction}>
            {uiTexts[scanMode].instruction}
          </Text>
        </View>

        {/* 下部の余白調整用ダミービュー */}
        <View style={{ height: 50 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 10,
  },
  link: {
    color: '#4DA6FF',
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 60,
    alignItems: 'center',
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30,30,30,0.8)',
    borderRadius: 30,
    padding: 5,
    marginTop: 10,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  activeMode: {
    backgroundColor: '#7C4DFF', // NOKKUカラー
  },
  modeText: {
    color: '#CCC',
    fontWeight: '600',
    fontSize: 14,
  },
  activeModeText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  scanFrameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // スキャン枠の四隅の装飾
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7C4DFF',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7C4DFF',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7C4DFF',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7C4DFF',
  },
  loadingInFrame: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  scanInstruction: {
    color: '#FFF',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    lineHeight: 24,
  },
});
