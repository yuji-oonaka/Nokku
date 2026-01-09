import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useQueryClient } from '@tanstack/react-query';

const ProfileEditScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // フォームの状態
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  // ★ 追加: Bio (自己紹介)
  const [bio, setBio] = useState('');

  // 住所・連絡先
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');

  // ローディング状態
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 画像アップロードフック
  const { imageUri, uploadedPath, isUploading, selectImage, setImageFromUrl } =
    useImageUpload('avatar');

  // APIからプロフィール詳細を取得
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/profile');
        const data = response.data;

        setRealName(data.real_name || '');
        setNickname(data.nickname || '');
        setEmail(data.email || '');

        // ★ Bioのセット
        setBio(data.bio || '');

        setPhone(data.phone_number || '');
        setPostalCode(data.postal_code || '');
        setPrefecture(data.prefecture || '');
        setCity(data.city || '');
        setAddress1(data.address_line1 || '');
        setAddress2(data.address_line2 || '');

        setImageFromUrl(data.image_url || null);
      } catch (error) {
        console.error('Profile fetch error:', error);
        Alert.alert('エラー', 'プロフィールの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [setImageFromUrl]);

  // 更新処理
  const handleUpdate = async () => {
    if (realName.trim().length === 0 || nickname.trim().length === 0) {
      Alert.alert('エラー', '本名とニックネームを入力してください。');
      return;
    }

    setUpdating(true);
    try {
      const payload: any = {
        real_name: realName,
        nickname: nickname,
        phone_number: phone,
        postal_code: postalCode,
        prefecture: prefecture,
        city: city,
        address_line1: address1,
        address_line2: address2,
      };

      // ★ アーティストのみ Bio と画像を更新可能
      if (user?.role === 'artist') {
        payload.bio = bio; // Bio追加
        if (uploadedPath) {
          payload.image_url = uploadedPath;
        }
      }

      const response = await api.put('/profile', payload);
      const updatedUser = response.data;

      // 画像の更新をローカルフックにも反映
      setImageFromUrl(updatedUser.image_url);

      // キャッシュ無効化 (マイページ等を更新)
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      Alert.alert('成功', 'プロフィールを更新しました。');
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        const errors = error.response.data.errors;
        let message = '入力内容を確認してください。';
        if (errors && errors.nickname) {
          message = 'そのニックネームは既に使用されています。';
        }
        Alert.alert('更新エラー', message);
      } else {
        console.error('Profile update error:', error);
        Alert.alert('エラー', '更新に失敗しました。');
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const isArtist = user?.role === 'artist';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            {/* =============================================
                1. 基本情報 (画像・名前)
               ============================================= */}
            <Text style={styles.groupTitle}>基本情報</Text>

            {/* 画像変更はアーティストのみ */}
            {isArtist && (
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={selectImage} disabled={isUploading}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[styles.avatarImage, styles.avatarPlaceholder]}
                    >
                      <Text style={styles.avatarPlaceholderText}>No Img</Text>
                    </View>
                  )}
                  {/* アップロード中のオーバーレイ */}
                  {isUploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#FFF" />
                    </View>
                  )}
                  {/* カメラアイコン的なオーバーレイ */}
                  {!isUploading && (
                    <View style={styles.editIconContainer}>
                      <Text style={styles.editIconText}>📷</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.avatarHint}>タップしてアイコンを変更</Text>
              </View>
            )}

            <Text style={styles.label}>メールアドレス (変更不可)</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={email}
              editable={false}
            />

            <Text style={styles.label}>ニックネーム (公開)</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="（チャット・投稿用）"
              placeholderTextColor="#888"
            />

            {/* ★ アーティスト用 Bio 入力欄 */}
            {isArtist && (
              <>
                <Text style={styles.label}>プロフィール文 (Bio)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="自己紹介や活動内容を入力..."
                  placeholderTextColor="#888"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top" // Android用: 上揃え
                />
              </>
            )}

            <Text style={styles.label}>本名 (非公開)</Text>
            <TextInput
              style={styles.input}
              value={realName}
              onChangeText={setRealName}
              placeholder="（チケット購入・決済用）"
              placeholderTextColor="#888"
            />

            {/* =============================================
                2. 配送先情報
               ============================================= */}
            <Text style={styles.groupTitle}>配送先・連絡先 (任意)</Text>
            <Text style={styles.subText}>
              グッズ購入時の配送先として使用されます。
            </Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>郵便番号</Text>
                <TextInput
                  style={styles.input}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="123-4567"
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>電話番号</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="090..."
                  placeholderTextColor="#888"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>都道府県</Text>
            <TextInput
              style={styles.input}
              value={prefecture}
              onChangeText={setPrefecture}
              placeholder="東京都"
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>市区町村・番地</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="渋谷区..."
              placeholderTextColor="#888"
            />
            <TextInput
              style={styles.input}
              value={address1}
              onChangeText={setAddress1}
              placeholder="恵比寿1-2-3..."
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>建物名・部屋番号</Text>
            <TextInput
              style={styles.input}
              value={address2}
              onChangeText={setAddress2}
              placeholder="アパート101号室"
              placeholderTextColor="#888"
            />

            {/* =============================================
                保存ボタン
               ============================================= */}
            {updating ? (
              <ActivityIndicator size="large" style={styles.buttonSpacing} />
            ) : (
              <View style={styles.buttonSpacing}>
                <Button title="プロフィールを更新" onPress={handleUpdate} />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 40 },
  center: { justifyContent: 'center', alignItems: 'center' },
  form: {
    padding: 20,
    backgroundColor: '#1C1C1E', // カードっぽい背景
    margin: 15,
    borderRadius: 12,
  },
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
  subText: {
    fontSize: 12,
    color: '#AAA',
    marginBottom: 15,
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
  textArea: {
    minHeight: 100, // Bio用の高さ
    paddingTop: 12,
  },
  readOnly: {
    backgroundColor: '#222',
    color: '#888',
    borderColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonSpacing: {
    marginTop: 30,
    marginBottom: 10,
  },
  /* Avatar Styles */
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    borderWidth: 3,
    borderColor: '#0A84FF',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#888',
    fontSize: 14,
  },
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
  avatarHint: {
    color: '#0A84FF',
    fontSize: 14,
    marginTop: 8,
  },
});

export default ProfileEditScreen;
