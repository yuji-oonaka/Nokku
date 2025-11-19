import Sound from 'react-native-sound';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// サウンドカテゴリの設定
Sound.setCategory('Playback');

// 振動のオプション
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// ★★★ (NEW) 許可する振動タイプの定義を追加 ★★★
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
    this.successSound = new Sound('success.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) console.log('failed to load success sound', error);
    });

    this.errorSound = new Sound('error.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) console.log('failed to load error sound', error);
    });
  }

  /**
   * 成功時の演出 (音 + 軽快な振動)
   */
  public playSuccess() {
    ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
    if (this.successSound) {
      this.successSound.stop(() => {
        this.successSound?.play();
      });
    }
  }

  /**
   * エラー時の演出 (音 + 重い振動)
   */
  public playError() {
    ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
    if (this.errorSound) {
      this.errorSound.stop(() => {
        this.errorSound?.play();
      });
    }
  }

  /**
   * ボタンタップ時の触感フィードバック
   * ★ 引数の型を HapticType に変更し、notificationWarning も受け取れるように修正
   */
  public triggerHaptic(type: HapticType = 'impactLight') {
    ReactNativeHapticFeedback.trigger(type, hapticOptions);
  }
}

export default new SoundService();