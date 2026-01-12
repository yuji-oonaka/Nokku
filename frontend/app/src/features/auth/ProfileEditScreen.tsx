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

const ProfileEditScreen = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ★ State集約: 10個の変数を1つのオブジェクトへ
  const [formData, setFormData] = useState<ProfileFormData>({
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
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 画像アップロードフック
  const { imageUri, uploadedPath, isUploading, selectImage, setImageFromUrl } =
    useImageUpload('avatar');

  // フォーム更新ハンドラ
  const handleChange = (key: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // APIからプロフィール詳細を取得
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/profile');
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

  // 更新処理
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
      };

      // アーティストのみ Bio と画像を更新可能
      if (user?.role === 'artist') {
        payload.bio = formData.bio;
        if (uploadedPath) {
          payload.image_url = uploadedPath;
        }
      }

      const response = await api.put('/profile', payload);
      const updatedUser = response.data;

      // 画像の更新をローカルフックにも反映
      setImageFromUrl(updatedUser.image_url);

      // キャッシュ無効化
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
            {/* 基本情報フォーム */}
            <ProfileBasicForm
              formData={formData}
              onChange={handleChange}
              isArtist={isArtist}
              imageUri={imageUri}
              selectImage={selectImage}
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
});

export default ProfileEditScreen;
