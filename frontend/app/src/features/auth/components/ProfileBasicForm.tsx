import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';

// フォームデータの型定義（親と共有）
export interface ProfileFormData {
  realName: string;
  nickname: string;
  email: string;
  bio: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
}

interface Props {
  formData: ProfileFormData;
  onChange: (key: keyof ProfileFormData, value: string) => void;
  isArtist: boolean;
  // 画像アップロード用プロップス
  imageUri: string | null;
  selectImage: () => void;
  isUploading: boolean;
}

export const ProfileBasicForm: React.FC<Props> = ({
  formData,
  onChange,
  isArtist,
  imageUri,
  selectImage,
  isUploading,
}) => {
  return (
    <View>
      <Text style={styles.groupTitle}>基本情報</Text>

      {/* --- アーティスト用: 画像変更エリア --- */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={selectImage} disabled={isUploading}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>No Img</Text>
              </View>
            )}

            {/* アップロード中 */}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#FFF" />
              </View>
            )}

            {/* 編集アイコン */}
            {!isUploading && (
              <View style={styles.editIconContainer}>
                {/* 一般ユーザーの場合はカメラというより「選ぶ」感じなのでアイコンを変えてもいいですが、一旦そのままでOK */}
                <Text style={styles.editIconText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>タップしてアイコンを変更</Text>
        </View>

      {/* --- 基本入力フィールド --- */}
      <Text style={styles.label}>メールアドレス (変更不可)</Text>
      <TextInput
        style={[styles.input, styles.readOnly]}
        value={formData.email}
        editable={false}
      />

      <Text style={styles.label}>ニックネーム (公開)</Text>
      <TextInput
        style={styles.input}
        value={formData.nickname}
        onChangeText={text => onChange('nickname', text)}
        placeholder="（チャット・投稿用）"
        placeholderTextColor="#888"
      />

      {/* アーティストのみ Bio 表示 */}
      {isArtist && (
        <>
          <Text style={styles.label}>プロフィール文 (Bio)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.bio}
            onChangeText={text => onChange('bio', text)}
            placeholder="自己紹介や活動内容を入力..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </>
      )}

      <Text style={styles.label}>本名 (非公開)</Text>
      <TextInput
        style={styles.input}
        value={formData.realName}
        onChangeText={text => onChange('realName', text)}
        placeholder="（チケット購入・決済用）"
        placeholderTextColor="#888"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    color: '#DDD',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
  },
  readOnly: {
    backgroundColor: '#222',
    color: '#888',
    borderColor: 'transparent',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  /* Avatar Styles */
  avatarSection: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    borderWidth: 3,
    borderColor: '#0A84FF',
  },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { color: '#888', fontSize: 14 },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#333',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  editIconText: { fontSize: 16 },
  avatarHint: { color: '#0A84FF', fontSize: 14, marginTop: 8 },
});
