import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import api from '../services/api';

// アップロードの種類
type UploadType = 'product' | 'event' | 'avatar' | 'post';

// フックの戻り値の型
interface UseImageUploadReturn {
  imageUri: string | null;       // 表示用のURI (選択直後はローカルパス、アップ後はリモートURL)
  uploadedPath: string | null;   // DB保存用のパス (例: products/abc.jpg)
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
    // ※ 既存画像の場合、pathはセットしない (変更がない限り送信しない運用のため)
    //    または、必要に応じて別途管理する
  }, []);

  const resetImage = useCallback(() => {
    setImageUri(null);
    setUploadedPath(null);
  }, []);

  // 画像を選択して自動的にアップロードする
  const selectImage = useCallback(async () => {
    try {
      // 1. 画像選択
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel || result.errorCode || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) return;

      // とりあえずプレビュー表示
      setImageUri(asset.uri);
      setIsUploading(true);

      // 2. アップロード準備
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'upload.jpg',
        type: asset.type || 'image/jpeg',
      });
      formData.append('type', type); // フォルダ振り分け用

      // 3. アップロード実行
      console.log('Uploading image...', type);
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 4. 結果を保存
      // response.data.path -> DB保存用 (例: events/xxx.jpg)
      // response.data.url  -> 表示用 (例: http://.../storage/events/xxx.jpg)
      console.log('Upload success:', response.data);
      
      setUploadedPath(response.data.path); 
      setImageUri(response.data.url); // サーバー上のURLに更新

    } catch (error: any) {
      console.error('Image upload failed:', error);
      Alert.alert('エラー', '画像のアップロードに失敗しました。');
      // 失敗したらプレビューも消す
      setImageUri(null);
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