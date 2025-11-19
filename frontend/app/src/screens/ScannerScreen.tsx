import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
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
// 1. ★ SoundService をインポート
import SoundService from '../services/SoundService';

type ScannerScreenRouteProp = RouteProp<MyPageStackParamList, 'Scan'>;

const ScannerScreen = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const isFocused = useIsFocused();
  const [isScanning, setIsScanning] = useState(false);
  const route = useRoute<ScannerScreenRouteProp>();
  const scanMode = route.params?.scanMode || 'ticket';

  const uiTexts = {
    ticket: {
      title: 'チケット入場スキャン',
      loading: '認証中...',
      successTitle: '認証成功',
    },
    order: {
      title: 'グッズ引換スキャン',
      loading: '処理中...',
      successTitle: '引換完了',
    },
  };

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleScan = async (qrCodeId: string) => {
    if (isScanning) return;
    setIsScanning(true);

    // ★★★ (NEW) スキャン検知音（ピッ！）をここで鳴らしてもOK
    // (API結果を待つなら下で鳴らす。ここでは手ごたえとして軽い振動だけ入れるのもアリ)
    SoundService.triggerHaptic('impactMedium');

    let endpoint = '';
    let successMessagePrefix = '';

    if (scanMode === 'ticket') {
      endpoint = '/tickets/scan';
      successMessagePrefix = 'チケットを使用済みにしました。';
    } else if (scanMode === 'order') {
      endpoint = '/orders/redeem';
      successMessagePrefix = '商品の引き換えが完了しました。';
    } else {
      Alert.alert('エラー', '無効なスキャンモードです。');
      setIsScanning(false);
      return;
    }

    try {
      const response = await api.post(endpoint, {
        qr_code_id: qrCodeId,
      });

      // 2. ★★★ 成功時の音と振動 ★★★
      SoundService.playSuccess();

      Alert.alert(
        uiTexts[scanMode].successTitle,
        response.data.message || successMessagePrefix,
        [{ text: 'OK', onPress: () => setIsScanning(false) }],
        { cancelable: false },
      );
    } catch (error: any) {
      // 3. ★★★ 失敗時の音と振動 ★★★
      SoundService.playError();

      let errorMessage = '不明なエラーが発生しました。';
      if (error.response) {
        console.error('API Error:', error.response.data);
        if (error.response.status === 409) {
          errorMessage =
            error.response.data.message || 'このQRコードは既に使用済みです。';
        } else if (error.response.status === 403) {
          errorMessage =
            error.response.data.message ||
            'この操作を実行する権限がありません。';
        } else if (
          error.response.status === 404 ||
          error.response.status === 422
        ) {
          errorMessage = '無効なQRコードです。';
        }
      } else {
        console.error('Network Error:', error.message);
        errorMessage = 'ネットワークエラーが発生しました。';
      }

      Alert.alert(
        'エラー',
        errorMessage,
        [{ text: 'OK', onPress: () => setIsScanning(false) }],
        { cancelable: false },
      );
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: codes => {
      if (!isScanning && codes.length > 0 && codes[0].value) {
        const scannedValue = codes[0].value;
        console.log('スキャン成功:', scannedValue);
        handleScan(scannedValue);
      }
    },
  });

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>カメラデバイスが見つかりません</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>カメラ権限がありません。</Text>
        <Text style={styles.link} onPress={() => Linking.openSettings()}>
          設定画面で権限を許可してください
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && !isScanning}
        codeScanner={codeScanner}
        enableZoomGesture={true}
      />
      {isScanning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>{uiTexts[scanMode].loading}</Text>
        </View>
      )}

      {!isScanning && (
        <Text style={styles.overlayText}>QRコードをかざしてください</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 18,
  },
  link: {
    color: '#007AFF',
    fontSize: 16,
    marginTop: 10,
  },
  overlayText: {
    position: 'absolute',
    bottom: 50,
    color: 'white',
    fontSize: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 10,
  },
});

export default ScannerScreen;
