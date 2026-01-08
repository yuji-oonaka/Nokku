import { useState, useEffect, useRef, useCallback } from 'react';
import { Vibration, Linking } from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import api from '../services/api';
import SoundService from '../services/SoundService';

export type ScanMode = 'ticket' | 'order';
export type ScanState = 'idle' | 'processing' | 'success' | 'error';

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
  
  const lastScanned = useRef<{ code: string; time: number } | null>(null);

  const resetScanner = useCallback(() => {
    setScanState('idle');
    setResultMessage('');
    setTicketInfo('');
  }, []);

  // 共通のレスポンス処理
  const handleResponse = useCallback((response: any, mode: ScanMode) => {
    SoundService.playSuccess();
    Vibration.vibrate(50);

    setScanState('success');
    setResultMessage(response.data.message);
    
    if (mode === 'ticket' && response.data.ticket) {
      const t = response.data.ticket;
      setTicketInfo(`${t.ticket_type.name}\n${t.seat_number}`);
    } else if (mode === 'order') {
      setTicketInfo('商品を確認して渡してください');
    }

    setTimeout(resetScanner, 2000);
  }, [resetScanner]);

  // 共通のエラー処理
  const handleError = useCallback((error: any) => {
    SoundService.playError();
    Vibration.vibrate([0, 100, 100, 100]);

    setScanState('error');
    let errorMessage = '通信エラーが発生しました';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
      if (error.response.data.ticket) {
          const t = error.response.data.ticket;
          setTicketInfo(`[使用済み]\n${t.seat_number} / ${t.scanner_name || '不明'}`);
      }
    }
    setResultMessage(errorMessage);
  }, []);

  // ★ 追加: 手入力実行関数
  const executeManualEntry = useCallback(async (ticketId: string) => {
    if (scanState !== 'idle') return;
    
    setScanState('processing');
    SoundService.triggerHaptic('impactMedium');

    try {
      // チケットモード以外（グッズなど）は現状手入力未対応なら弾く、あるいは対応する
      if (scanMode !== 'ticket') {
        throw new Error('手入力は現在チケットのみ対応しています');
      }

      // APIコール
      const response = await api.post('/tickets/manual', { ticket_id: parseInt(ticketId, 10) });
      handleResponse(response, scanMode);

    } catch (error: any) {
      handleError(error);
    }
  }, [scanState, scanMode, handleResponse, handleError]);


  // QRスキャン実行関数
  const onCodeScanned = useCallback(async (codes: Code[]) => {
    if (scanState !== 'idle' || codes.length === 0) return;
    const codeValue = codes[0]?.value;
    if (!codeValue) return;

    const now = Date.now();
    if (
      lastScanned.current &&
      lastScanned.current.code === codeValue &&
      now - lastScanned.current.time < 2000
    ) {
      return;
    }
    lastScanned.current = { code: codeValue, time: now };

    setScanState('processing');
    SoundService.triggerHaptic('impactMedium');

    try {
      const endpoint = scanMode === 'ticket' ? '/tickets/scan' : '/orders/redeem';
      const response = await api.post(endpoint, { qr_code_id: codeValue });
      handleResponse(response, scanMode);
    } catch (error: any) {
      handleError(error);
    }
  }, [scanState, scanMode, handleResponse, handleError]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: onCodeScanned,
  });

  const openSettings = () => Linking.openSettings();

  return {
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
    executeManualEntry, // ★ エクスポート
  };
};