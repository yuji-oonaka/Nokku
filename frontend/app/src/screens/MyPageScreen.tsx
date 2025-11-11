import React from 'react'; // 1. ★ useState, useCallback, useFocusEffect を削除
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  // 2. ★ Alert を削除
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// 3. ★ api.ts と auth を削除

// 4. ★ useAuth フックをインポート
import { useAuth } from '../context/AuthContext';

// 5. ★ User 型のインポート (DbUser に変更)
import { DbUser } from '../context/AuthContext';

// ログアウト処理の型
interface MyPageScreenProps {
  onLogout: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<any>();

  // 6. ★ useAuth() フックから user と loading を取得
  const { user, loading } = useAuth();

  // 7. ★ 全削除:
  //    fetchProfile, useFocusEffect, useState(user), useState(loading)
  //    は AuthContext が実行するため、すべて不要になります。

  // 読み込み中 (AuthContext が /profile を読み込んでいる間)
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  // ユーザー情報が取得できなかった場合 (ログアウト状態など)
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

  // 8. ★ user.role に基づいて判定 (ロジックは変更なし)
  const isArtistOrAdmin = user.role === 'artist' || user.role === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 1. プロフィール情報表示 */}
        <View style={styles.profileHeader}>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>

        {/* 2. 共通メニュー (プロフィール編集のみ) */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>アカウント</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <Text style={styles.menuButtonText}>プロフィールを編集</Text>
          </TouchableOpacity>
        </View>

        {/* 3. ★ 一般ユーザー用メニューを追加 */}
        {!isArtistOrAdmin && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>チケット</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('MyTickets')}
            >
              <Text style={styles.menuButtonText}>購入済みチケット一覧</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* ★★★ ここまで ★★★ */}

        {/* 4. ★ アーティスト/管理者用メニュー (番号が 3->4 にずれる) */}
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

            {/* ↓↓↓ 5. 自動入場ゲートへのボタン */}
            <TouchableOpacity
              style={[styles.menuButton, styles.gateButton]} // 6. ★ 特別なスタイルを適用
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

// ... (Styles は変更なし) ...
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
    backgroundColor: '#34C759', // 目立つ緑色
    borderColor: '#34C759',
  },
  gateButtonText: {
    color: '#FFFFFF', // 白文字
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
