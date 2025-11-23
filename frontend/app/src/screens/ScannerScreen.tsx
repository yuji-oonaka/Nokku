import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';
import api from '../services/api';
import SoundService from '../services/SoundService';

// アイコンが使える環境であれば使用、なければTextで代用するための簡易コンポーネント
// もし react-native-vector-icons が入っていれば import Icon from 'react-native-vector-icons/Feather'; に変えてください
const TabIcon = ({ name, active }: { name: string; active: boolean }) => (
  <Text
    style={{ color: active ? '#FFF' : '#CCC', fontSize: 20, marginRight: 8 }}
  >
    {name === 'ticket' ? '🎫' : '🛍️'}
  </Text>
);

type ScannerScreenRouteProp = RouteProp<MyPageStackParamList, 'Scan'>;
type ScanMode = 'ticket' | 'order'; // 'order' はグッズ引換を指します

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
      if (scanMode === 'ticket') {
        await processTicketScan(codeValue);
      } else {
        await processProductScan(codeValue);
      }
    } catch (error: any) {
      handleScanError(error);
    } finally {
      // 少し待ってから次のスキャンを許可
      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);
    }
  };

  // チケットスキャン処理
  const processTicketScan = async (qrCodeId: string) => {
    const response = await api.post('/tickets/scan', {
      qr_code_id: qrCodeId,
    });

    SoundService.playSuccess();
    SoundService.vibrateSuccess();

    const ticket = response.data.ticket;
    const eventName = ticket.event?.title || 'イベント';

    Alert.alert('入場確認OK', `${eventName}\n\n入場処理が完了しました！`);
  };

  // グッズ引き換え処理
  const processProductScan = async (orderItemId: string) => {
    const response = await api.post('/orders/redeem', {
      order_item_id: orderItemId,
    });

    SoundService.playSuccess();
    SoundService.vibrateSuccess();

    const item = response.data.data;
    const productName = item.product?.name || '商品';

    Alert.alert('引き換えOK', `${productName}\n\n引き換え処理が完了しました！`);
  };

  // エラーハンドリング
  const handleScanError = (error: any) => {
    SoundService.playError();
    SoundService.vibrateError();

    console.error('Scan failed:', error);

    const serverMessage = error.response?.data?.message;
    const statusCode = error.response?.status;

    let alertTitle = 'エラー';
    let alertMessage = '読み取りに失敗しました。';

    if (statusCode === 403) {
      alertTitle = '権限エラー';
      // バックエンドからの「他者のイベントのチケットは〜」を表示
      alertMessage =
        serverMessage || 'このチケット/グッズを操作する権限がありません。';
    } else if (statusCode === 409) {
      alertTitle = '使用不可';
      alertMessage = serverMessage || '既に使用済みです。';
    } else if (statusCode === 404) {
      alertTitle = '見つかりません';
      alertMessage = 'データが見つかりませんでした。';
    } else if (serverMessage) {
      alertMessage = serverMessage;
    }

    Alert.alert(alertTitle, alertMessage);
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
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!isProcessing} // 処理中はカメラを一時停止しても良い
          codeScanner={codeScanner}
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
          </View>
          <Text style={styles.scanInstruction}>
            {scanMode === 'ticket'
              ? '入場チケットのQRコードを\n枠内に合わせてください'
              : '注文詳細のQRコードを\n枠内に合わせてください'}
          </Text>
        </View>

        {/* 処理中インジケータ */}
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.loadingText}>処理中...</Text>
          </View>
        )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    color: '#FFF',
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
