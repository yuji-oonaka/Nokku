import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView, // 1. ★ ScrollView をインポート
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfileEditScreen = () => {
  // 2. ★ 既存の State
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  // 3. ★ 住所用の State を追加
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const { user, loading: authLoading } = useAuth();

  // 4. ★ useFocusEffect を修正
  useFocusEffect(
    useCallback(() => {
      if (user) {
        setRealName(user.real_name || '');
        setNickname(user.nickname || '');
        setEmail(user.email || '');

        // 5. ★ 住所 State をセット (DBのカラム名に合わせる)
        setPhone(user.phone_number || '');
        setPostalCode(user.postal_code || '');
        setPrefecture(user.prefecture || '');
        setCity(user.city || '');
        setAddress1(user.address_line1 || '');
        setAddress2(user.address_line2 || '');

        setLoading(false);
      } else if (!authLoading) {
        setLoading(false);
        Alert.alert('エラー', 'プロフィールの取得に失敗しました。');
      }
    }, [user, authLoading]),
  );

  // 6. ★ handleUpdate を修正
  const handleUpdate = async () => {
    if (realName.trim().length === 0 || nickname.trim().length === 0) {
      Alert.alert('エラー', '本名とニックネームを入力してください。');
      return;
    }

    setUpdating(true);
    try {
      // 7. ★ 送信するデータに住所を追加 (DBのカラム名に合わせる)
      const response = await api.put('/profile', {
        real_name: realName,
        nickname: nickname,
        phone_number: phone,
        postal_code: postalCode,
        prefecture: prefecture,
        city: city,
        address_line1: address1,
        address_line2: address2,
      });

      // 8. ★ レスポンスから State を更新 (念のため)
      setRealName(response.data.real_name);
      setNickname(response.data.nickname);
      setPhone(response.data.phone_number || '');
      setPostalCode(response.data.postal_code || '');
      setPrefecture(response.data.prefecture || '');
      setCity(response.data.city || '');
      setAddress1(response.data.address_line1 || '');
      setAddress2(response.data.address_line2 || '');

      Alert.alert('成功', 'プロフィールを更新しました。');
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        // バリデーションエラー (ニックネーム重複など)
        const errors = error.response.data.errors;
        let message = '更新エラー';

        if (errors && errors.nickname) {
          message = 'そのニックネームは既に使用されています。';
        } else {
          // 住所などの他のバリデーションエラー
          message = '入力内容を確認してください。';
        }
        Alert.alert('更新エラー', message);
      } else {
        console.error(
          'Profile update error:',
          error.response?.data || error.message,
        );
        Alert.alert('エラー', '更新に失敗しました。');
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 9. ★ ScrollView で全体をラップ */}
      <ScrollView>
        <View style={styles.form}>
          {/* --- 基本情報セクション --- */}
          <Text style={styles.groupTitle}>基本情報</Text>

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

          {/* 10. ★ 配送先住所フォームを追加 */}
          <Text style={styles.groupTitle}>配送先情報 (任意)</Text>

          <Text style={styles.label}>電話番号</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="09012345678"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />

          <Text style={styles.label}>郵便番号</Text>
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="123-4567"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            textContentType="postalCode"
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
            textContentType="streetAddressLine1"
          />

          <Text style={styles.label}>建物名・部屋番号</Text>
          <TextInput
            style={styles.input}
            value={address2}
            onChangeText={setAddress2}
            placeholder="アパート101号室"
            placeholderTextColor="#888"
            textContentType="streetAddressLine2"
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

// 11. ★ スタイルを更新
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // ★ ローディング時も背景色を指定
  },
  form: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 8,
  },
  // 12. ★ グループタイトル用のスタイルを追加
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    paddingBottom: 10,
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
  readOnly: {
    backgroundColor: '#444',
    color: '#AAA',
  },
  buttonSpacing: {
    marginTop: 20,
    paddingBottom: 20, // ★ スクロール下部に余白
  },
});

export default ProfileEditScreen;
