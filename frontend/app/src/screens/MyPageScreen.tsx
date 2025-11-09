import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../services/api';
import auth from '@react-native-firebase/auth'; // ログアウト処理のため

// ユーザーの型（簡易版）
interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'artist' | 'admin';
}

// ログアウト処理の型 (MainTabNavigatorから渡される)
interface MyPageScreenProps {
  onLogout: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<any>(); // ナビゲーションフック
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // プロフィール情報を取得する関数
  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      setUser(response.data);
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
      Alert.alert('エラー', 'プロフィールの取得に失敗しました。');
      // ログインセッションが切れている可能性もある
      if (auth().currentUser) {
        // Firebase Authは生きてるがDBが死んでる
      } else {
        onLogout(); // Firebase Authが切れてたら強制ログアウト
      }
    } finally {
      setLoading(false);
    }
  };

  // 画面フォーカス時にプロフィールを再取得
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
    }, []),
  );

  // 読み込み中
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  // ユーザー情報が取得できなかった場合
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>ユーザー情報の取得に失敗しました。</Text>
        <TouchableOpacity style={styles.menuButton} onPress={onLogout}>
          <Text style={styles.menuButtonText}>ログアウト</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // アーティストまたは管理者か
  const isArtistOrAdmin = user.role === 'artist' || user.role === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 1. プロフィール情報表示 */}
        <View style={styles.profileHeader}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>

        {/* 2. 共通メニュー */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>アカウント</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <Text style={styles.menuButtonText}>プロフィールを編集</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('MyTickets')}
          >
            <Text style={styles.menuButtonText}>購入済みチケット一覧</Text>
          </TouchableOpacity>
        </View>

        {/* 3. アーティスト/管理者用メニュー */}
        {isArtistOrAdmin && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>
              アーティスト・管理者メニュー
            </Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('EventCreate')}
            >
              <Text style={styles.menuButtonText}>イベントを作成する</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('ProductCreate')}
            >
              <Text style={styles.menuButtonText}>グッズを作成する</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('PostCreate')}
            >
              <Text style={styles.menuButtonText}>投稿を作成する</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('Scan')}
            >
              <Text style={styles.menuButtonText}>QRコードスキャン</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. ログアウト */}
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={[styles.menuButton, styles.logoutButton]}
            onPress={onLogout}
          >
            <Text style={styles.logoutButtonText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// スタイル (ダークモードを意識したスタイルに変更)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // 背景を黒に
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 20,
  },
  profileHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 16,
    color: '#888',
    marginTop: 5,
  },
  menuGroup: {
    marginVertical: 15,
  },
  menuGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  menuButton: {
    backgroundColor: '#1C1C1E', // ボタンの背景色
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  menuButtonText: {
    color: '#0A84FF', // ボタンテキスト（青）
    fontSize: 17,
  },
  logoutButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  logoutButtonText: {
    color: '#FF3B30', // ログアウト（赤）
    fontSize: 17,
    textAlign: 'center',
  },
});

export default MyPageScreen;
