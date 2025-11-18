// ArtistProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
// 4. ★ React Query と新しい型/関数をインポート
import { useQuery } from '@tanstack/react-query';
import {
  ArtistPostMin,
  ArtistEventMin,
  ArtistProductMin,
  ArtistProfileData,
  fetchArtistProfileData,
} from '../api/queries';

type ArtistProfileRouteParams = {
  ArtistProfile: { artistId: number };
};
type ArtistProfileRouteProp = RouteProp<
  ArtistProfileRouteParams,
  'ArtistProfile'
>;

type TabKey = 'posts' | 'events' | 'products';

// --- コンポーネント ---
const ArtistProfileScreen = () => {
  const route = useRoute<ArtistProfileRouteProp>();
  const navigation = useNavigation<any>();
  const { artistId } = route.params;

  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // 8. ★ (NEW) useQuery フック (useEffect の代わり)
  const {
    data: artistData, // 👈 artistData state の代わり
    isLoading, // 👈 loading state の代わり
    isRefetching, // 👈 裏での更新中
    refetch,
    isError,
  } = useQuery({
    queryKey: ['artistProfile', artistId],
    queryFn: () => fetchArtistProfileData(artistId),
    enabled: !!artistId,
  });

  // 9. ★ (NEW) RefreshControl が呼び出す "専用" の関数
  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
    } catch (error) {
      /* (エラーは useQuery の isError が検知) */
    }
    setIsManualRefetching(false);
  }, [refetch]);

  /**
   * イベント詳細ページ（EventsStack）へ遷移する
   * (タブ跨ぎナビゲーション)
   */
  const handleEventPress = (eventId: number) => {
    navigation.navigate('EventsStack', {
      screen: 'EventDetail',
      params: { eventId: eventId },
    });
  };

  /**
   * グッズ詳細ページ（ProductsStack）へ遷移する
   * (タブ跨ぎナビゲーション)
   */
  const handleProductPress = (productId: number) => {
    navigation.navigate('ProductsStack', {
      screen: 'ProductDetail',
      params: { productId: productId },
    });
  };

  // --- タブコンテンツレンダリング ---
  const renderTabContent = () => {
    if (!artistData) return null;

    let data: any[] = [];
    let renderItem: any;
    let emptyText = '';

    switch (activeTab) {
      case 'posts':
        data = artistData.posts;
        emptyText = 'お知らせはありません';
        renderItem = ({ item }: { item: ArtistPostMin }) => (
          // お知らせはタップ不要なので <View> のまま
          <View style={styles.listItem}>
            <Text style={styles.listText}>{item.content}</Text>
            <Text style={styles.subText}>
              {new Date(item.created_at).toLocaleString('ja-JP')}
            </Text>
          </View>
        );
        break;

      case 'events':
        data = artistData.events;
        emptyText = 'イベントはありません';
        renderItem = ({ item }: { item: ArtistEventMin }) => (
          // 5. ★ <View> を <TouchableOpacity> に変更
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleEventPress(item.id)} // 👈 遷移ハンドラを呼ぶ
          >
            <Text style={styles.listText}>{item.title}</Text>
            <Text style={styles.subText}>
              {new Date(item.event_date).toLocaleString('ja-JP')}
            </Text>
          </TouchableOpacity>
        );
        break;

      case 'products':
        data = artistData.products;
        emptyText = 'グッズはありません';
        renderItem = ({ item }: { item: ArtistProductMin }) => (
          // 6. ★ <View> を <TouchableOpacity> に変更
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleProductPress(item.id)} // 👈 遷移ハンドラを呼ぶ
          >
            <Text style={styles.listText}>{item.name}</Text>
            <Text style={styles.subText}>¥{item.price.toLocaleString()}</Text>
          </TouchableOpacity>
        );
        break;
    }

    return (
      <FlatList
        data={data}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
        style={styles.tabContent}
        contentContainerStyle={data.length === 0 ? { flex: 1 } : undefined}
      />
    );
  };

  // --- ローディング中 ---
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  // --- データ取得失敗 ---
  if (!artistData) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>
          アーティスト情報の取得に失敗しました。
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.artistName}>{artistData.nickname}</Text>
      </View>

      {/* タブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={styles.tabText}>お知らせ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={styles.tabText}>イベント</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'products' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={styles.tabText}>グッズ</Text>
        </TouchableOpacity>
      </View>

      {/* タブコンテンツ */}
      <View style={styles.contentWrapper}>{renderTabContent()}</View>
    </SafeAreaView>
  );
};

// --- スタイル ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FF3B30', fontSize: 16 },

  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  artistName: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1C1C1E',
  },
  tabButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#0A84FF' },
  tabText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  contentWrapper: { flex: 1 }, // タブコンテンツを残り全体に広げる
  tabContent: { flex: 1 },
  listItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  listText: { color: '#FFF', fontSize: 16 },
  subText: { color: '#888', fontSize: 14, marginTop: 5 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 50, fontSize: 16 },
});

export default ArtistProfileScreen;
