import React, { useState, useEffect } from 'react';
import {
  View,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal, // ★追加
  Text, // ★追加
  TouchableOpacity, // ★追加
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useImageUpload } from '../../hooks/useImageUpload';
import {
  ProfileBasicForm,
  ProfileFormData,
} from './components/ProfileBasicForm';
import { ProfileAddressForm } from './components/ProfileAddressForm';
import { UserItem } from '../../api/user';
import InventoryScreen from '../gacha/screens/InventoryScreen';

const ProfileEditScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ★追加: 図鑑モーダルの開閉スイッチ
  const [showInventory, setShowInventory] = useState(false);

  // State集約
  const [formData, setFormData] = useState<
    ProfileFormData & { currentIconId: number | null }
  >({
    realName: '',
    nickname: '',
    email: '',
    bio: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
    currentIconId: null, // ★追加: アイコンIDを管理
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const { imageUri, uploadedPath, isUploading, selectImage, setImageFromUrl } =
    useImageUpload('avatar');

  // フォーム更新ハンドラ
  const handleChange = (key: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // ★追加: 図鑑でアイコンが選ばれたときの処理
  const handleSelectIcon = (item: UserItem) => {
    // 1. フォームデータにはIDをセット（保存用）
    setFormData(prev => ({ ...prev, currentIconId: item.id }));

    // 2. ★追加: 画面のプレビュー画像を、選んだアイコンの画像に差し替える！
    // これで「装備した感」が出ます
    setImageFromUrl(item.image_url);

    // 3. モーダルを閉じる
    setShowInventory(false);
    Alert.alert(
      'アイコンを選択しました',
      '変更を確定するには「プロフィールを更新」ボタンを押してください。',
    );
  };

  // APIからプロフィール詳細を取得
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/profile'); // バックエンドが現在の情報を返す前提
        const data = response.data;

        setFormData({
          realName: data.real_name || '',
          nickname: data.nickname || '',
          email: data.email || '',
          bio: data.bio || '',
          phone: data.phone_number || '',
          postalCode: data.postal_code || '',
          prefecture: data.prefecture || '',
          city: data.city || '',
          address1: data.address_line1 || '',
          address2: data.address_line2 || '',
          currentIconId: data.current_icon_id || null, // ★追加: 現在の装備IDを取得
        });

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

  const handleUpdate = async () => {
    if (
      formData.realName.trim().length === 0 ||
      formData.nickname.trim().length === 0
    ) {
      Alert.alert('エラー', '本名とニックネームを入力してください。');
      return;
    }

    setUpdating(true);
    try {
      const payload: any = {
        real_name: formData.realName,
        nickname: formData.nickname,
        phone_number: formData.phone,
        postal_code: formData.postalCode,
        prefecture: formData.prefecture,
        city: formData.city,
        address_line1: formData.address1,
        address_line2: formData.address2,

        // ★追加: 全ユーザー共通でBioとアイコンIDを送るように変更
        bio: formData.bio,
        current_icon_id: formData.currentIconId,
      };

      // 画像アップロードがあった場合のみURLを上書き (アーティスト用)
      if (user?.role === 'artist' && uploadedPath) {
        payload.image_url = uploadedPath;
      }

      const response = await api.put('/profile', payload);
      const updatedUser = response.data;

      // 更新後の画像を反映
      setImageFromUrl(updatedUser.image_url);

      // キャッシュ無効化
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      // ヘッダーなどのユーザー情報も更新したい場合は 'user' も無効化
      await queryClient.invalidateQueries({ queryKey: ['user'] });

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

  // ★追加: 画像タップ時のハンドラ
  // アーティストなら画像アップロード、一般ユーザーなら図鑑を開く
  const handleImagePress = () => {
    if (isArtist) {
      selectImage();
    } else {
      setShowInventory(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            {/* 基本情報フォーム */}
            <ProfileBasicForm
              formData={formData}
              onChange={handleChange}
              isArtist={isArtist}
              imageUri={imageUri}
              // ★変更: ここで渡す関数を差し替えました
              selectImage={handleImagePress}
              isUploading={isUploading}
            />

            {/* 住所情報フォーム */}
            <ProfileAddressForm formData={formData} onChange={handleChange} />

            {/* 保存ボタン */}
            <View style={styles.buttonSpacing}>
              {updating ? (
                <ActivityIndicator size="large" color="#0A84FF" />
              ) : (
                <Button title="プロフィールを更新" onPress={handleUpdate} />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ★追加: アイコン選択モーダル */}
      <Modal
        visible={showInventory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              装備するアイコンを選択
            </Text>
            <TouchableOpacity onPress={() => setShowInventory(false)}>
              <Text
                style={{ color: '#0A84FF', fontSize: 16, fontWeight: 'bold' }}
              >
                閉じる
              </Text>
            </TouchableOpacity>
          </View>

          {/* 図鑑コンポーネント (選択モード) */}
          <InventoryScreen
            mode="select" // ★追加: 選択モードであることを明示
            onSelect={handleSelectIcon}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  form: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 12,
  },
  buttonSpacing: {
    marginTop: 30,
    marginBottom: 10,
  },
  // ★追加スタイル
  modalContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
});

export default ProfileEditScreen;
