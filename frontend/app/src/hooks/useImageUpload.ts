import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import api from '../services/api';

// アップロードの種類
type UploadType = 'product' | 'event' | 'avatar' | 'post';

// フックの戻り値の型
interface UseImageUploadReturn {
  imageUri: string | null;       // 表示用のURI
  uploadedPath: string | null;   // DB保存用のパス
  isUploading: boolean;          // アップロード中かどうか
  selectImage: () => Promise<void>; // 画像選択関数
  resetImage: () => void;        // リセット関数
  setImageFromUrl: (url: string | null) => void; // 既存画像のセット用
}

export const useImageUpload = (type: UploadType): UseImageUploadReturn => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 既存の画像URLをセットする (編集画面用)
  const setImageFromUrl = useCallback((url: string | null) => {
    setImageUri(url);
  }, []);

  const resetImage = useCallback(() => {
    setImageUri(null);
    setUploadedPath(null);
  }, []);

  // 画像を選択して自動的にアップロードする
  const selectImage = useCallback(async () => {
    try {
      // 1. 画像選択 (リサイズ設定を追加)
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
        maxWidth: 1024,  // ★ 追加: 横幅制限
        maxHeight: 1024, // ★ 追加: 縦幅制限
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode || !result.assets || result.assets.length === 0) {
        Alert.alert('エラー', '画像の選択に失敗しました。');
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) return;

      // 簡易サイズチェック (10MB以上は警告を出すが、処理は続行)
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        console.warn('Selected image is large:', asset.fileSize);
      }

      // とりあえずプレビュー表示
      setImageUri(asset.uri);
      setIsUploading(true);

      // 2. アップロード準備
      const formData = new FormData();
      
      // Android/iOS間のURI形式差異を吸収するための安全策
      const uri = Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', '');

      formData.append('image', {
        uri: uri,
        name: asset.fileName || `upload_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      } as any); // TSエラー回避のためのキャスト
      
      formData.append('type', type); // フォルダ振り分け用

      // 3. アップロード実行
      console.log(`Uploading image [${type}]...`);
      
      const response = await api.post('/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
        // タイムアウト設定を追加 (30秒)
        timeout: 30000, 
      });

      // 4. 結果を保存
      console.log('Upload success:', response.data);
      setUploadedPath(response.data.path); 
      setImageUri(response.data.url); 

    } catch (error: any) {
      console.error('Image upload failed:', error);
      
      // ★ エラーハンドリングの強化
      let errorMessage = '画像のアップロードに失敗しました。';
      
      if (error.response) {
        // 413 Payload Too Large
        if (error.response.status === 413) {
          errorMessage = '画像サイズが大きすぎます。別の画像を選択してください。';
        } else if (error.response.status === 500) {
          errorMessage = 'サーバーエラーが発生しました。時間を置いてお試しください。';
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '通信がタイムアウトしました。通信環境を確認してください。';
      }

      Alert.alert('アップロードエラー', errorMessage);
      
      // 失敗したらプレビューも消す（再試行させるため）
      setImageUri(null);
      setUploadedPath(null);

    } finally {
      setIsUploading(false);
    }
  }, [type]);

  return {
    imageUri,
    uploadedPath,
    isUploading,
    selectImage,
    resetImage,
    setImageFromUrl,
  };
};