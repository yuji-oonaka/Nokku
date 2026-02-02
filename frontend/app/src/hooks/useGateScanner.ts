import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration, Linking, Alert } from 'react-native'; // ★ Alert を追加
import {
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import api from '../services/api';
import SoundService from '../services/SoundService';
import { UserTicket } from '../api/queries';

export type ScanMode = 'ticket' | 'order';
export type ScanState = 'idle' | 'processing' | 'success' | 'error';

// APIレスポンスの型定義 (整合性確保)
interface ScanResponse {
  message: string;
  ticket?: UserTicket;
  order?: any;
  summary?: string;
  requires_payment?: boolean; // ★ 追加: 現金受領が必要かどうかのフラグ
}

interface UseGateScannerProps {
  initialMode?: ScanMode;
}

export const useGateScanner = ({ initialMode = 'ticket' }: UseGateScannerProps) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMode, setScanMode] = useState<ScanMode>(initialMode);
  const [resultMessage, setResultMessage] = useState('');
  const [ticketInfo, setTicketInfo] = useState('');

  // ★ 追加: 現金決済フロー用の State
  const [isCashPaymentRequired, setIsCashPaymentRequired] = useState(false);
  const [currentQrCode, setCurrentQrCode] = useState<string | null>(null);
  
  const lastScanned = useRef<{ code: string; time: number } | null>(null);

  const resetScanner = useCallback(() => {
    setScanState('idle');
    setResultMessage('');
    setTicketInfo('');
    // ★ リセット時に現金決済状態もクリア
    setIsCashPaymentRequired(false);
    setCurrentQrCode(null);
  }, []);

  /**
   * 共通のレスポンス処理 (現金決済対応版)
   */
  const handleResponse = useCallback((data: ScanResponse, mode: ScanMode, code?: string) => {
    SoundService.playSuccess();
    Vibration.vibrate(50);

    setScanState('success');
    setResultMessage(data.message);
    
    if (mode === 'ticket' && data.ticket) {
      const t = data.ticket;
      const typeName = t.ticket_type?.name || '不明な券種'; 
      setTicketInfo(`${typeName}\n${t.seat_number}`);
      setTimeout(resetScanner, 3000); // チケットは自動リセット
    } 
    else if (mode === 'order') {
      // バックエンドからの真実（商品・合計金額）を表示
      setTicketInfo(data.summary || '商品を確認してください');

      if (data.requires_payment) {
        // ★ 現金決済が必要な場合、自動リセットをせずボタン表示フラグを立てる
        setIsCashPaymentRequired(true);
        setCurrentQrCode(code || null);
      } else {
        // 既に決済済みの場合は自動リセット
        setTimeout(resetScanner, 3000);
      }
    }
  }, [resetScanner]);

  /**
   * 共通のエラー処理
   */
  const handleError = useCallback((error: any) => {
    SoundService.playError();
    Vibration.vibrate([0, 100, 100, 100]);

    setScanState('error');
    let errorMessage = '通信エラーが発生しました';

    if (error.response?.data) {
      const data = error.response.data as ScanResponse;
      errorMessage = data.message;
      
      if (data.ticket) {
        const t = data.ticket;
        setTicketInfo(`[${t.status === 'used' ? '使用済み' : '無効'}]\n${t.seat_number}`);
      }
    }
    setResultMessage(errorMessage);
  }, []);

  /**
   * ★ 新規追加: 現金決済の受領確定関数
   * 監査ログを残すためバックエンドに確定リクエストを送る
   */
  const confirmCashPayment = async () => {
    if (!currentQrCode || !ticketInfo) return;

    // UXはセキュリティ。現場で「金額を声に出して確認」させるための二段確認
    Alert.alert(
      '【最終確認】現金受領',
      `${ticketInfo}\n\n上記金額を正しく受領しましたか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '受領して引換完了', 
          style: 'destructive',
          onPress: async () => {
            setScanState('processing');
            try {
              await api.post('/orders/confirm-cash', { qr_code_id: currentQrCode });
              SoundService.playSuccess();
              setResultMessage('引換完了！');
              setIsCashPaymentRequired(false);
              setTimeout(resetScanner, 2000);
            } catch (error: any) {
              handleError(error);
            }
          }
        }
      ]
    );
  };

  // 手入力実行関数 (ScannerScreen用)
  const executeManualEntry = useCallback(async (ticketId: string) => {
    if (scanState !== 'idle') return;
    
    setScanState('processing');
    SoundService.triggerHaptic('impactMedium');

    try {
      if (scanMode !== 'ticket') {
        throw new Error('手入力は現在チケットのみ対応しています');
      }

      const response = await api.post<ScanResponse>('/tickets/manual', { 
        ticket_id: parseInt(ticketId, 10) 
      });
      handleResponse(response.data, scanMode);
    } catch (error: any) {
      handleError(error);
    }
  }, [scanState, scanMode, handleResponse, handleError]);

  // QRスキャン実行関数 (共通)
  const onCodeScanned = useCallback(async (codes: Code[]) => {
    if (scanState !== 'idle' || codes.length === 0) return;
    const codeValue = codes[0]?.value;
    if (!codeValue) return;

    // 連続スキャン防止
    const now = Date.now();
    if (lastScanned.current && lastScanned.current.code === codeValue && now - lastScanned.current.time < 2000) {
      return;
    }
    lastScanned.current = { code: codeValue, time: now };

    setScanState('processing');
    SoundService.triggerHaptic('impactMedium');

    try {
      const endpoint = scanMode === 'ticket' ? '/tickets/scan' : '/orders/redeem';
      const response = await api.post<ScanResponse>(endpoint, { qr_code_id: codeValue });
      // ★ スキャンしたコード（codeValue）も渡すように修正
      handleResponse(response.data, scanMode, codeValue);
    } catch (error: any) {
      handleError(error);
    }
  }, [scanState, scanMode, handleResponse, handleError]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onCodeScanned,
  });

  return {
    device,
    hasPermission,
    scanState,
    scanMode,
    resultMessage,
    ticketInfo,
    isCashPaymentRequired, // ★ 追加
    confirmCashPayment,    // ★ 追加
    setScanMode,
    resetScanner,
    openSettings: () => Linking.openSettings(),
    codeScanner,
    executeManualEntry,
  };
};