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
// ↓↓↓ 1. ★ この 'useIsFocused' の行を、以下の3行ブロックに修正します
import { useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import api from '../services/api';
// ↓↓↓ 2. ★ この行が新しく追加されていることを確認してください
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';

type ScannerScreenRouteProp = RouteProp<MyPageStackParamList, 'Scan'>;

const ScannerScreen = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const isFocused = useIsFocused(); // 画面がフォーカスされているか
  const [isScanning, setIsScanning] = useState(false);
  // 4. ★ route から 'scanMode' を受け取る
  const route = useRoute<ScannerScreenRouteProp>();
  // 渡されなかった場合は 'ticket' をフォールバック (安全のため)
  const scanMode = route.params?.scanMode || 'ticket';

  // 5. ★ モードに応じて動的にテキストを設定
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

  // 1. カメラ権限の確認とリクエスト
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // 6. ★ API呼び出し処理 (handleScan) を大幅に修正
  const handleScan = async (qrCodeId: string) => {
    if (isScanning) return;
    setIsScanning(true);

    // 7. ★ scanMode に応じて API エンドポイントとメッセージを決定
    let endpoint = '';
    let successMessagePrefix = '';

    if (scanMode === 'ticket') {
      endpoint = '/tickets/scan'; // チケット用API
      successMessagePrefix = 'チケットを使用済みにしました。';
    } else if (scanMode === 'order') {
      endpoint = '/orders/redeem'; // ★ グッズ引換用 API
      successMessagePrefix = '商品の引き換えが完了しました。';
    } else {
      Alert.alert('エラー', '無効なスキャンモードです。');
      setIsScanning(false);
      return;
    }

    try {
      // 8. ★ 動的なエンドポイントを呼び出す
      const response = await api.post(endpoint, {
        qr_code_id: qrCodeId,
      });

      // 9. ★ 成功時のアラート (動的なタイトルとメッセージ)
      Alert.alert(
        uiTexts[scanMode].successTitle, // '認証成功' or '引換完了'
        response.data.message || successMessagePrefix,
        [{ text: 'OK', onPress: () => setIsScanning(false) }],
        { cancelable: false },
      );
    } catch (error: any) {
      // 10. ★ エラーハンドリング (共通化)
      let errorMessage = '不明なエラーが発生しました。';
      if (error.response) {
        console.error('API Error:', error.response.data);
        if (error.response.status === 409) {
          // 409 Conflict (使用済み)
          errorMessage =
            error.response.data.message || 'このQRコードは既に使用済みです。';
        } else if (error.response.status === 403) {
          // 403 Forbidden (権限なし / 他アーティストの商品)
          errorMessage =
            error.response.data.message ||
            'この操作を実行する権限がありません。';
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
        'エラー', // エラータイトルは共通
        errorMessage,
        [{ text: 'OK', onPress: () => setIsScanning(false) }],
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

  // 11. ★ 描画処理 (ローディングテキストを動的に)
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && !isScanning}
        codeScanner={codeScanner}
        enableZoomGesture={true}
      />
      {/* スキャン処理中のオーバーレイ */}
      {isScanning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>
            {uiTexts[scanMode].loading} {/* 👈 '認証中...' or '処理中...' */}
          </Text>
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
