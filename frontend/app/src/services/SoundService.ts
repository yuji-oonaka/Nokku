import Sound from 'react-native-sound';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// サウンドカテゴリの設定
Sound.setCategory('Playback');

// 振動のオプション
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// 許可する振動タイプの定義
type HapticType =
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError'
  | 'selection';

class SoundService {
  private successSound: Sound | null = null;
  private errorSound: Sound | null = null;

  constructor() {
    this.initializeSounds();
  }

  private initializeSounds() {
    this.successSound = new Sound('success.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) console.log('failed to load success sound', error);
    });

    this.errorSound = new Sound('error.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) console.log('failed to load error sound', error);
    });
  }

  /**
   * 成功時の音声を再生
   * (振動は vibrateSuccess で行うため、ここでは音のみ)
   */
  public playSuccess() {
    if (this.successSound) {
      this.successSound.setCurrentTime(0);
      this.successSound.play((success) => {
        if (!success) console.log('success sound playback failed');
      });
    }
  }

  /**
   * エラー時の音声を再生
   * (振動は vibrateError で行うため、ここでは音のみ)
   */
  public playError() {
    if (this.errorSound) {
      this.errorSound.setCurrentTime(0);
      this.errorSound.play((success) => {
        if (!success) console.log('error sound playback failed');
      });
    }
  }

  /**
   * 成功時の振動（軽快な2回振動など）
   * ★ ScannerScreenのエラー解消のために追加
   */
  public vibrateSuccess() {
    this.triggerHaptic('notificationSuccess');
  }

  /**
   * エラー時の振動（重めの振動）
   * ★ ScannerScreenのエラー解消のために追加
   */
  public vibrateError() {
    this.triggerHaptic('notificationError');
  }

  /**
   * 汎用的なハプティックフィードバック
   */
  public triggerHaptic(type: HapticType = 'impactMedium') {
    ReactNativeHapticFeedback.trigger(type, hapticOptions);
  }
}

export default new SoundService();