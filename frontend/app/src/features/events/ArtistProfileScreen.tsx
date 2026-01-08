import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetchArtistProfileData } from '../../api/queries';

// 分離したタブコンポーネント
import ArtistPostsTab from './tabs/ArtistPostsTab';
import ArtistEventsTab from './tabs/ArtistEventsTab';
import ArtistProductsTab from './tabs/ArtistProductsTab';

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

  // --- Actions ---
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

  // --- Render Content ---
  const renderTabContent = () => {
    if (!artistData) return null;

    switch (activeTab) {
      case 'posts':
        return (
          <ArtistPostsTab
            data={artistData.posts}
            isRefreshing={isManualRefetching}
            onRefresh={onRefresh}
          />
        );
      case 'events':
        return (
          <ArtistEventsTab
            data={artistData.events}
            isRefreshing={isManualRefetching}
            onRefresh={onRefresh}
            onPress={handleEventPress}
          />
        );
      case 'products':
        return (
          <ArtistProductsTab
            data={artistData.products}
            isRefreshing={isManualRefetching}
            onRefresh={onRefresh}
            onPress={handleProductPress}
          />
        );
      default:
        return null;
    }
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

      {/* タブバー */}
      <View style={styles.tabContainer}>
        {(['posts', 'events', 'products'] as TabKey[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab === 'posts'
                ? 'お知らせ'
                : tab === 'events'
                ? 'イベント'
                : 'グッズ'}
            </Text>
          </TouchableOpacity>
        ))}
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
});

export default ArtistProfileScreen;
