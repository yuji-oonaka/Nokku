import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useImageUpload } from '../hooks/useImageUpload';
// ★ 追加
import { useQueryClient } from '@tanstack/react-query';

const ProfileEditScreen = () => {
  // ★ firebaseUser を取得
  const { user, firebaseUser, loading: authLoading } = useAuth();
  // ★ QueryClient を取得
  const queryClient = useQueryClient();

  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  // ... (他のstateは省略) ...
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const { imageUri, uploadedPath, isUploading, selectImage, setImageFromUrl } =
    useImageUpload('avatar');

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setRealName(user.real_name || '');
        setNickname(user.nickname || '');
        setEmail(user.email || '');
        setPhone(user.phone_number || '');
        setPostalCode(user.postal_code || '');
        setPrefecture(user.prefecture || '');
        setCity(user.city || '');
        setAddress1(user.address_line1 || '');
        setAddress2(user.address_line2 || '');
        setImageFromUrl(user?.image_url || null);
        setLoading(false);
      } else if (!authLoading) {
        setLoading(false);
        Alert.alert('エラー', 'プロフィールの取得に失敗しました。');
      }
    }, [user, authLoading, setImageFromUrl]),
  );

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

      if (user?.role === 'artist' && uploadedPath) {
        payload.image_url = uploadedPath;
      }

      const response = await api.put('/profile', payload);
      const updatedUser = response.data;

      setRealName(updatedUser.real_name);
      setNickname(updatedUser.nickname);
      setImageFromUrl(updatedUser.image_url);

      // ★★★ ここでキャッシュを更新 (App.tsxと連携) ★★★
      if (firebaseUser?.uid) {
        queryClient.setQueryData(['profile', firebaseUser.uid], updatedUser);
      }

      Alert.alert('成功', 'プロフィールを更新しました。');
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        const errors = error.response.data.errors;
        let message = '更新エラー';
        if (errors && errors.nickname) {
          message = 'そのニックネームは既に使用されています。';
        } else {
          message = '入力内容を確認してください。';
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
    return <ActivityIndicator size="large" style={styles.center} />;
  }

  const isArtist = user?.role === 'artist';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.form}>
          <Text style={styles.groupTitle}>基本情報</Text>
          {isArtist && (
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={selectImage} disabled={isUploading}>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>No Img</Text>
                  </View>
                )}
                {isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarHint}>タップしてアイコンを変更</Text>
            </View>
          )}

          {/* ... 残りの入力フォーム (省略なしで元のまま使用してください) ... */}
          <Text style={styles.label}>メールアドレス (変更不可)</Text>
          <TextInput
            style={[styles.input, styles.readOnly]}
            value={email}
            editable={false}
          />
          <Text style={styles.label}>本名 (非公開)</Text>
          <TextInput
            style={styles.input}
            value={realName}
            onChangeText={setRealName}
            placeholder="（チケット購入・決済用）"
            placeholderTextColor="#888"
          />
          <Text style={styles.label}>ニックネーム (公開)</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="（チャット・投稿用）"
            placeholderTextColor="#888"
          />

          <Text style={styles.groupTitle}>配送先情報 (任意)</Text>
          <Text style={styles.label}>電話番号</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="09012345678"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>郵便番号</Text>
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="123-4567"
            placeholderTextColor="#888"
            keyboardType="number-pad"
          />
          <Text style={styles.label}>都道府県</Text>
          <TextInput
            style={styles.input}
            value={prefecture}
            onChangeText={setPrefecture}
            placeholder="東京都"
            placeholderTextColor="#888"
          />
          <Text style={styles.label}>市区町村</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="渋谷区"
            placeholderTextColor="#888"
          />
          <Text style={styles.label}>番地など</Text>
          <TextInput
            style={styles.input}
            value={address1}
            onChangeText={setAddress1}
            placeholder="恵比寿1-2-3"
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

          {updating ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="更新する" onPress={handleUpdate} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  form: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 8,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    paddingBottom: 10,
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  readOnly: { backgroundColor: '#444', color: '#AAA' },
  buttonSpacing: { marginTop: 20, paddingBottom: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#0A84FF',
    resizeMode: 'cover',
  },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { color: '#888', fontSize: 14 },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  avatarHint: { color: '#0A84FF', fontSize: 14, marginTop: 10 },
});

export default ProfileEditScreen;
