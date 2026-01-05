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
  Image,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ArtistPostMin,
  ArtistEventMin,
  ArtistProductMin,
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

const ArtistProfileScreen = () => {
  const route = useRoute<ArtistProfileRouteProp>();
  const navigation = useNavigation<any>();
  const { artistId } = route.params;

  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  const {
    data: artistData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['artistProfile', artistId],
    queryFn: () => fetchArtistProfileData(artistId),
    enabled: !!artistId,
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
    } catch (error) {}
    setIsManualRefetching(false);
  }, [refetch]);

  // 1. ★ 修正: メインタブのスタック名を経由して遷移するように変更
  const handleEventPress = (eventId: number) => {
    navigation.navigate('EventsStack', {
      screen: 'EventDetail',
      params: { eventId },
    });
  };

  const handleProductPress = (productId: number) => {
    navigation.navigate('ProductsStack', {
      screen: 'ProductDetail',
      params: { productId },
    });
  };

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
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleEventPress(item.id)}
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
          <TouchableOpacity
            style={styles.listItem} // スタイルは共通ですが、中身をRowレイアウトにします
            onPress={() => handleProductPress(item.id)}
          >
            {/* 2. ★ 追加: グッズ画像の表示エリア */}
            <View style={styles.productRow}>
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.productImage}
                />
              ) : (
                <View
                  style={[styles.productImage, styles.productPlaceholder]}
                />
              )}

              {/* テキスト情報 */}
              <View style={styles.productInfo}>
                <Text style={styles.listText}>{item.name}</Text>
                <Text style={styles.subText}>
                  ¥{item.price.toLocaleString()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
        break;
    }

    return (
      <FlatList
        data={data}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        }
        style={styles.tabContent}
        contentContainerStyle={data.length === 0 ? { flex: 1 } : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      />
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (!artistData) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>
          アーティスト情報の取得に失敗しました。
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {artistData.image_url ? (
            <Image
              source={{ uri: artistData.image_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>
                {artistData.nickname.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.artistName}>{artistData.nickname}</Text>

        {artistData.bio && (
          <Text style={styles.artistBio}>{artistData.bio}</Text>
        )}
      </View>

      {/* タブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'posts' && styles.activeTabText,
            ]}
          >
            お知らせ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'events' && styles.activeTabText,
            ]}
          >
            イベント
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'products' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('products')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'products' && styles.activeTabText,
            ]}
          >
            グッズ
          </Text>
        </TouchableOpacity>
      </View>

      {/* タブコンテンツ */}
      <View style={styles.contentWrapper}>{renderTabContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FF3B30', fontSize: 16, marginBottom: 10 },
  retryButton: { padding: 10 },
  retryText: { color: '#0A84FF', fontSize: 16 },

  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
  },
  avatarContainer: {
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#0A84FF',
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    color: '#888',
    fontWeight: 'bold',
  },
  artistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  artistBio: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0A84FF',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },

  contentWrapper: { flex: 1 },
  tabContent: { flex: 1 },
  listItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  listText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: { color: '#888', fontSize: 12 },

  // 3. ★ 追加: グッズ表示用のスタイル
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 15,
    backgroundColor: '#333',
  },
  productPlaceholder: {
    backgroundColor: '#333',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: { color: '#888', fontSize: 16 },
});

export default ArtistProfileScreen;
