import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
  Linking, // 必要であれば外部リンク用に
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

// ★ リファクタリング: メニュー行をコンポーネント化して記述量を削減
const MenuRow = ({
  title,
  onPress,
  isDestructive = false,
  isSpecial = false,
}: {
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
  isSpecial?: boolean;
}) => (
  <TouchableOpacity
    style={[
      styles.menuButton,
      isSpecial && styles.gateButton, // 特別なボタン（緑など）
      isDestructive && styles.logoutButton, // 破壊的なボタン（赤枠など）
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.menuButtonText,
        isSpecial && styles.gateButtonText,
        isDestructive && styles.logoutButtonText,
      ]}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

interface MyPageScreenProps {
  onLogout: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation<any>();
  const { user, loading, firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // 引っ張って更新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (firebaseUser?.uid) {
      try {
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
        <MenuRow title="ログアウト" onPress={onLogout} isDestructive />
      </SafeAreaView>
    );
  }

  const isArtistOrAdmin = user.role === 'artist' || user.role === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* =============================================
            1. プロフィール情報表示エリア
           ============================================= */}
        <View style={styles.profileHeader}>
          {/* アイコン */}
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

          {/* 名前・メール */}
          <Text style={styles.profileName}>{user.nickname}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>

          {/* ★ 追加: Bio (自己紹介文) */}
          {/* user型にbioがない場合は表示されませんが、APIから返ってくれば表示されます */}
          {user.bio && <Text style={styles.profileBio}>{user.bio}</Text>}
        </View>

        {/* =============================================
            2. アカウント設定
           ============================================= */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>アカウント</Text>
          <MenuRow
            title="プロフィールを編集"
            onPress={() => navigation.navigate('ProfileEdit')}
          />
        </View>

        {/* =============================================
            3. 一般ユーザー用メニュー (購入・履歴)
           ============================================= */}
        {!isArtistOrAdmin && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>チケット・購入履歴</Text>
            <MenuRow
              title="購入済みチケット一覧"
              onPress={() => navigation.navigate('MyTickets')}
            />
            <MenuRow
              title="お気に入りグッズ一覧 ❤️"
              onPress={() => navigation.navigate('FavoriteProducts')}
            />
            <MenuRow
              title="グッズ購入履歴"
              onPress={() => navigation.navigate('OrderHistory')}
            />
            <MenuRow
              title="運営へのお問い合わせ"
              onPress={() => navigation.navigate('Inquiry')}
            />
          </View>
        )}

        {/* =============================================
            4. アーティスト/管理者用メニュー (管理機能)
           ============================================= */}
        {isArtistOrAdmin && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>
              アーティスト・管理者メニュー
            </Text>
            <MenuRow
              title="イベントを作成する"
              onPress={() => navigation.navigate('EventCreate')}
            />
            <MenuRow
              title="グッズを作成する"
              onPress={() => navigation.navigate('ProductCreate')}
            />
            <MenuRow
              title="投稿を作成する"
              onPress={() => navigation.navigate('PostCreate')}
            />

            {/* スキャン関連 */}
            <View style={styles.separator} />
            <MenuRow
              title="チケット入場スキャン"
              onPress={() =>
                navigation.navigate('Scan', { scanMode: 'ticket' })
              }
            />
            <MenuRow
              title="グッズ引換スキャン"
              onPress={() => navigation.navigate('Scan', { scanMode: 'order' })}
            />

            {/* 特殊ボタン: ゲート */}
            <View style={styles.separator} />
            <MenuRow
              title="(会場用) 自動入場ゲートを起動"
              onPress={() => navigation.navigate('GateScanner')}
              isSpecial
            />
          </View>
        )}

        {/* =============================================
            5. ログアウト
           ============================================= */}
        <View style={styles.menuGroup}>
          <MenuRow title="ログアウト" onPress={onLogout} isDestructive />
        </View>

        {/* スクロール下部の余白 */}
        <View style={{ height: 40 }} />
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
  /* Profile Header */
  profileHeader: {
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222', // 少し薄く
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
    marginBottom: 10,
  },
  // ★ Bioのスタイル
  profileBio: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  /* Menu Items */
  menuGroup: {
    marginTop: 20,
    marginBottom: 5,
  },
  menuGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, // 細い線にする
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#0A84FF', // iOS Blue
    fontSize: 17,
  },
  /* Special Buttons */
  gateButton: {
    backgroundColor: '#34C759', // Green
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 10, // 少し内側に入れる
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  gateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
  },
  logoutButtonText: {
    color: '#FF3B30', // Red
    textAlign: 'center',
    width: '100%',
  },
  separator: {
    height: 10, // グループ内の小分け用
  },
});

export default MyPageScreen;
