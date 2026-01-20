import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { useAuth, DbUser } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useLoginBonus } from '../../hooks/useLoginBonus';

// --- Types ---
type MenuItem = {
  id: string;
  title: string;
  action: () => void;
  isDestructive?: boolean;
  isSpecial?: boolean;
};

type MenuSection = {
  id: string;
  title?: string;
  items: MenuItem[];
};

// --- Components ---

const PointCard: React.FC<{ points: number }> = ({ points }) => (
  <View style={styles.pointCard}>
    <View>
      <Text style={styles.pointLabel}>所持ポイント</Text>
      <Text style={styles.pointValue}>
        💎 {points.toLocaleString()} <Text style={styles.unit}>pt</Text>
      </Text>
    </View>
    <TouchableOpacity
      style={styles.buyButton}
      onPress={() => Alert.alert('チャージ機能', 'まだ準備中だよ！')}
    >
      <Text style={styles.buyButtonText}>+</Text>
    </TouchableOpacity>
  </View>
);

const MenuRow: React.FC<{ item: MenuItem }> = ({ item }) => (
  <TouchableOpacity
    style={[
      styles.menuButton,
      item.isSpecial && styles.gateButton,
      item.isDestructive && styles.logoutButton,
    ]}
    onPress={item.action}
    activeOpacity={0.7}
  >
    <Text
      style={[
        styles.menuButtonText,
        item.isSpecial && styles.gateButtonText,
        item.isDestructive && styles.logoutButtonText,
      ]}
    >
      {item.title}
    </Text>
    {!item.isSpecial && !item.isDestructive && (
      <Text style={styles.chevron}>›</Text>
    )}
  </TouchableOpacity>
);

// --- Hooks ---

const useMenuConfig = (
  user: DbUser | null,
  navigation: any,
  onLogout: () => void,
) => {
  return useMemo(() => {
    if (!user) return [];

    const isArtistOrAdmin = user.role === 'artist' || user.role === 'admin';
    // ★ 追加: Staff判定
    const isStaff = user.role === 'staff';

    const sections: MenuSection[] = [];

    // 1. アカウント設定 (全ロール共通)
    sections.push({
      id: 'account',
      title: 'アカウント',
      items: [
        {
          id: 'profile_edit',
          title: 'プロフィールを編集',
          action: () => navigation.navigate('ProfileEdit'),
        },
      ],
    });

    // 2. 一般ユーザー向け
    // ★ 修正: Staffが含まれないように厳密に除外
    if (!isArtistOrAdmin && !isStaff) {
      sections.push({
        id: 'user_general',
        title: 'チケット・購入履歴',
        items: [
          {
            id: 'my_tickets',
            title: '購入済みチケット一覧',
            action: () => navigation.navigate('MyTickets'),
          },
          {
            id: 'favorites',
            title: 'お気に入りグッズ一覧 ❤️',
            action: () => navigation.navigate('FavoriteProducts'),
          },
          {
            id: 'history',
            title: 'グッズ購入履歴',
            action: () => navigation.navigate('OrderHistory'),
          },
          {
            id: 'inquiry',
            title: 'お問い合わせ / サポート',
            action: () => navigation.navigate('InquiryList'),
          },
        ],
      });
    }

    // 3. アーティスト・管理者向け
    if (isArtistOrAdmin) {
      sections.push({
        id: 'artist_tools',
        title: 'アーティスト・管理者メニュー',
        items: [
          {
            id: 'event_create',
            title: 'イベントを作成する',
            action: () => navigation.navigate('EventCreate'),
          },
          {
            id: 'product_create',
            title: 'グッズを作成する',
            action: () => navigation.navigate('ProductCreate'),
          },
          {
            id: 'post_create',
            title: '投稿を作成する',
            action: () => navigation.navigate('PostCreate'),
          },
        ],
      });
      // アーティストもスキャン機能は使える
      sections.push({
        id: 'artist_scan',
        title: 'スキャン・会場管理',
        items: [
          {
            id: 'scan_ticket',
            title: 'チケット入場スキャン',
            action: () => navigation.navigate('Scan', { scanMode: 'ticket' }),
          },
          {
            id: 'scan_order',
            title: 'グッズ引換スキャン',
            action: () => navigation.navigate('Scan', { scanMode: 'order' }),
          },
          {
            id: 'gate_scanner',
            title: '(会場用) 自動入場ゲート起動',
            action: () => navigation.navigate('GateScanner'),
            isSpecial: true,
          },
        ],
      });
    }

    // ★ 追加: スタッフ専用メニュー
    if (isStaff) {
      sections.push({
        id: 'staff_tools',
        title: 'スタッフ業務メニュー',
        items: [
          {
            id: 'scan_ticket',
            title: 'チケット入場スキャン',
            action: () => navigation.navigate('Scan', { scanMode: 'ticket' }),
          },
          {
            id: 'scan_order',
            title: 'グッズ引換スキャン',
            action: () => navigation.navigate('Scan', { scanMode: 'order' }),
          },
          {
            id: 'gate_scanner',
            title: '自動入場ゲート起動',
            action: () => navigation.navigate('GateScanner'),
            isSpecial: true,
          },
        ],
      });
    }

    // 4. システム (ログアウト)
    sections.push({
      id: 'system',
      items: [
        {
          id: 'logout',
          title: 'ログアウト',
          action: onLogout,
          isDestructive: true,
        },
      ],
    });

    return sections;
  }, [user, navigation, onLogout]);
};

// --- Main Component ---

interface MyPageScreenProps {
  onLogout?: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ onLogout }) => {
  
  // マイページが開かれるたびにチェックが走り、未取得なら付与＆アラート表示されます
  useLoginBonus();
  const navigation = useNavigation<any>();
  const { user, loading, firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // ログアウト処理
  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      Alert.alert('ログアウト', 'ログアウトしますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: () => auth().signOut(),
        },
      ]);
    }
  }, [onLogout]);

  const menuSections = useMenuConfig(user, navigation, handleLogout);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (firebaseUser?.uid) {
      try {
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
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
        <Text style={styles.errorText}>ユーザー情報が見つかりません</Text>
        <MenuRow
          item={{
            id: 'logout',
            title: 'ログアウト',
            action: handleLogout,
            isDestructive: true,
          }}
        />
      </SafeAreaView>
    );
  }

  const isArtistOrAdmin = user.role === 'artist' || user.role === 'admin';
  // ★ 追加
  const isStaff = user.role === 'staff';

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
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* === プロフィールヘッダー === */}
        <View style={styles.profileHeader}>
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
            {/* バッジ表示ロジック修正 */}
            {isArtistOrAdmin && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>ARTIST</Text>
              </View>
            )}
            {isStaff && (
              <View
                style={[styles.badgeContainer, { backgroundColor: '#34C759' }]}
              >
                <Text style={styles.badgeText}>STAFF</Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{user.nickname}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {user.bio ? <Text style={styles.profileBio}>{user.bio}</Text> : null}
        </View>

        {/* ★ 修正: Staff以外のみポイントカードを表示 */}
        {!isStaff && <PointCard points={user.points || 0} />}

        {/* === メニューレンダリング === */}
        {menuSections.map(section => (
          <View key={section.id} style={styles.menuGroup}>
            {section.title && (
              <Text style={styles.menuGroupTitle}>{section.title}</Text>
            )}
            {section.items.map(item => (
              <MenuRow key={item.id} item={item} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FF3B30', fontSize: 16, marginBottom: 20 },

  /* Profile Header */
  profileHeader: {
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
  },
  avatarContainer: {
    marginBottom: 15,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
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
  avatarInitials: { fontSize: 40, color: '#888', fontWeight: 'bold' },
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
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: { fontSize: 14, color: '#888', marginBottom: 10 },
  profileBio: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  /* Point Card Styles */
  pointCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  pointLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  pointValue: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  unit: { fontSize: 16, color: '#AAA', fontWeight: 'normal' },
  buyButton: {
    backgroundColor: '#333',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#0A84FF',
    fontSize: 26,
    lineHeight: 28,
    marginTop: -2,
  },

  /* Menu Items */
  menuGroup: { marginTop: 20, marginBottom: 5 },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButtonText: { color: '#0A84FF', fontSize: 17 },
  chevron: { color: '#666', fontSize: 18, fontWeight: 'bold' },

  /* Special Buttons */
  gateButton: {
    backgroundColor: '#34C759',
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 10,
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  gateButtonText: { color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' },
  logoutButton: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
    justifyContent: 'center',
  },
  logoutButtonText: { color: '#FF3B30', textAlign: 'center', width: '100%' },
});

export default MyPageScreen;
