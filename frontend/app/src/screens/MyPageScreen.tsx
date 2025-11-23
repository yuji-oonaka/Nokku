import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl, // ★ 追加
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
// ★ 追加: キャッシュ操作用
import { useQueryClient } from '@tanstack/react-query';

interface MyPageScreenProps {
  onLogout: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<any>();
  // ★ 修正: firebaseUser も取得 (リフレッシュ時のキー指定に必要)
  const { user, loading, firebaseUser } = useAuth();

  // ★ 追加: リフレッシュ用フック
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // ★ 追加: 引っ張って更新する処理
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (firebaseUser?.uid) {
      try {
        // App.tsx で使っているキー ['profile', uid] を無効化し、強制再取得させる
        await queryClient.invalidateQueries({
          queryKey: ['profile', firebaseUser.uid],
        });
      } catch (error) {
        console.error('Refresh failed', error);
      }
    }
    setRefreshing(false);
  }, [queryClient, firebaseUser]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

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

  const isArtistOrAdmin = user.role === 'artist' || user.role === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        // ★ 追加: リフレッシュコントロールの設定
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF" // ローディングくるくるの色
          />
        }
      >
        {/* 1. プロフィール情報表示 (リッチ版) */}
        <View style={styles.profileHeader}>
          {/* ★★★ アイコン表示エリア ★★★ */}
          <View style={styles.avatarContainer}>
            {user.image_url ? (
              <Image
                source={{ uri: user.image_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>
                  {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            {/* アーティストバッジ */}
            {isArtistOrAdmin && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>ARTIST</Text>
              </View>
            )}
          </View>
          {/* ★★★★★★★★★★★★★★★★★ */}

          <Text style={styles.profileName}>{user.nickname}</Text>
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
        </View>

        {/* 3. 一般ユーザー用メニュー */}
        {!isArtistOrAdmin && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>チケット・購入履歴</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('MyTickets')}
            >
              <Text style={styles.menuButtonText}>購入済みチケット一覧</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('FavoriteProducts')}
            >
              <Text style={styles.menuButtonText}>お気に入りグッズ一覧 ❤️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('OrderHistory')}
            >
              <Text style={styles.menuButtonText}>グッズ購入履歴</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('Inquiry')}
            >
              <Text style={styles.menuButtonText}>運営へのお問い合わせ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. アーティスト/管理者用メニュー */}
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
              onPress={() =>
                navigation.navigate('Scan', { scanMode: 'ticket' })
              }
            >
              <Text style={styles.menuButtonText}>チケット入場スキャン</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('Scan', { scanMode: 'order' })}
            >
              <Text style={styles.menuButtonText}>グッズ引換スキャン</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.gateButton]}
              onPress={() => navigation.navigate('GateScanner')}
            >
              <Text style={styles.gateButtonText}>
                (会場用) 自動入場ゲートを起動
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. ログアウト */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#111',
  },
  avatarContainer: {
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#0A84FF',
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    color: '#888',
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#888',
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
    backgroundColor: '#1C1C1E',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  menuButtonText: {
    color: '#0A84FF',
    fontSize: 17,
  },
  gateButton: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  gateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    textAlign: 'center',
  },
});

export default MyPageScreen;
