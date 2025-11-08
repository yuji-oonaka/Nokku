import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator, // 読み込み中のインジケーター
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import api from '../services/api';

const ScannerScreen = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const isFocused = useIsFocused(); // 画面がフォーカスされているか
  const [isScanning, setIsScanning] = useState(false);

  // 1. カメラ権限の確認とリクエスト
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // 4. API呼び出し処理
  const handleScan = async (qrCodeId: string) => {
    if (isScanning) return; // 処理中の場合は何もしない

    setIsScanning(true); // スキャン開始

    try {
      // 5. バックエンドAPIを呼び出す
      const response = await api.post('/tickets/scan', {
        qr_code_id: qrCodeId,
      });

      // 6. 成功時のアラート
      Alert.alert(
        '認証成功',
        response.data.message || 'チケットを使用済みにしました。',
        [{ text: 'OK', onPress: () => setIsScanning(false) }], // OKを押したらスキャン再開
        { cancelable: false },
      );
    } catch (error: any) {
      // 7. エラーハンドリング
      let errorMessage = '不明なエラーが発生しました。';
      if (error.response) {
        // バックエンドからのエラー
        console.error('API Error:', error.response.data);
        if (error.response.status === 409) {
          // 409 Conflict (使用済み)
          errorMessage =
            error.response.data.message || 'このチケットは既に使用済みです。';
        } else if (error.response.status === 403) {
          // 403 Forbidden (権限なし)
          errorMessage =
            error.response.data.message ||
            'スキャンを実行する権限がありません。';
        } else if (
          error.response.status === 404 ||
          error.response.status === 422
        ) {
          // 404 Not Found / 422 Unprocessable (QRコードIDが不正)
          errorMessage = '無効なQRコードです。';
        }
      } else {
        console.error('Network Error:', error.message);
        errorMessage = 'ネットワークエラーが発生しました。';
      }

      Alert.alert(
        '認証エラー',
        errorMessage,
        [{ text: 'OK', onPress: () => setIsScanning(false) }], // OKを押したらスキャン再開
        { cancelable: false },
      );
    }
  };

  // 2. QRコードスキャナーの設定
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: codes => {
      // スキャン中でなく、コードが検出された場合
      if (!isScanning && codes.length > 0 && codes[0].value) {
        const scannedValue = codes[0].value;
        console.log('スキャン成功:', scannedValue);
        handleScan(scannedValue); // API呼び出しを実行
      }
    },
  });

  // 3. 描画処理
  // デバイスがない場合
  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>カメラデバイスが見つかりません</Text>
      </View>
    );
  }

  // カメラ権限がない場合
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

  // 9. 描画処理の更新 (ローディング表示)
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && !isScanning} // 10. スキャン処理中はカメラを一時停止
        codeScanner={codeScanner}
        enableZoomGesture={true}
      />
      {/* 11. スキャン処理中のオーバーレイ */}
      {isScanning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>認証中...</Text>
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
