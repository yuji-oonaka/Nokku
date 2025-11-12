// ArtistProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

// --- 型定義 ---
type ArtistProfileRouteParams = {
  ArtistProfile: { artistId: number };
};
type ArtistProfileRouteProp = RouteProp<ArtistProfileRouteParams, 'ArtistProfile'>;

interface Post { id: number; content: string; created_at: string; }
interface Event { id: number; title: string; event_date: string; }
interface Product { id: number; name: string; price: number; }
interface ArtistProfileData {
  id: number;
  nickname: string;
  posts: Post[];
  events: Event[];
  products: Product[];
}

type TabKey = 'posts' | 'events' | 'products';

// --- コンポーネント ---
const ArtistProfileScreen = () => {
  const route = useRoute<ArtistProfileRouteProp>();
  const { artistId } = route.params;

  const [loading, setLoading] = useState(true);
  const [artistData, setArtistData] = useState<ArtistProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  // API取得
  useEffect(() => {
    const fetchArtistProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get<ArtistProfileData>(`/artists/${artistId}`);
        setArtistData(response.data);
      } catch (error) {
        console.error('アーティスト詳細取得エラー:', error);
        Alert.alert('エラー', '情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchArtistProfile();
  }, [artistId]);

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
        renderItem = ({ item }: { item: Post }) => (
          <View style={styles.listItem}>
            <Text style={styles.listText}>{item.content}</Text>
          </View>
        );
        break;
      case 'events':
        data = artistData.events;
        emptyText = 'イベントはありません';
        renderItem = ({ item }: { item: Event }) => (
          <View style={styles.listItem}>
            <Text style={styles.listText}>{item.title}</Text>
            <Text style={styles.subText}>{item.event_date}</Text>
          </View>
        );
        break;
      case 'products':
        data = artistData.products;
        emptyText = 'グッズはありません';
        renderItem = ({ item }: { item: Product }) => (
          <View style={styles.listItem}>
            <Text style={styles.listText}>{item.name}</Text>
            <Text style={styles.subText}>¥{item.price.toLocaleString()}</Text>
          </View>
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
  if (loading) {
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
        <Text style={styles.errorText}>アーティスト情報の取得に失敗しました。</Text>
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
          style={[styles.tabButton, activeTab === 'products' && styles.activeTab]}
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
