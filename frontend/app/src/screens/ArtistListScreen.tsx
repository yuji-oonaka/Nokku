import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext'; // 1. ★ 自分のロール確認用

// APIから返ってくるアーティストの型
interface Artist {
  id: number;
  name: string;
  // (将来的に 'avatar_url' などを追加)
}

const ArtistListScreen = () => {
  const { user } = useAuth(); // 2. ★ 自分のロールを取得
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  // 3. ★ フォロー中のIDを保持するSet (高速検索用)
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());

  // 4. ★ データを取得する関数
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/artists');
      setArtists(response.data.artists);
      // 5. ★ ID配列を Set に変換して State に保存
      setFollowingIds(new Set(response.data.following_ids));
    } catch (error) {
      console.error('アーティスト一覧の取得エラー:', error);
      Alert.alert('エラー', 'アーティスト一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  // 6. ★ 画面フォーカス時にデータを再取得
  useFocusEffect(
    useCallback(() => {
      const fetch = async () => {
        await fetchData(); // 👈 async関数を内部で呼び出す
      };
      fetch();
    }, [fetchData]),
  );


  // 7. ★ フォロー処理
  const handleFollow = async (artistId: number) => {
    try {
      // 画面を即時更新 (Optimistic UI)
      setFollowingIds(prevIds => new Set(prevIds).add(artistId));
      // APIを呼び出し
      await api.post(`/artists/${artistId}/follow`);
    } catch (error) {
      Alert.alert('エラー', 'フォローに失敗しました');
      // 失敗したら画面を元に戻す
      setFollowingIds(prevIds => {
        const newIds = new Set(prevIds);
        newIds.delete(artistId);
        return newIds;
      });
    }
  };

  // 8. ★ アンフォロー処理
  const handleUnfollow = async (artistId: number) => {
    try {
      // 画面を即時更新
      setFollowingIds(prevIds => {
        const newIds = new Set(prevIds);
        newIds.delete(artistId);
        return newIds;
      });
      // APIを呼び出し
      await api.delete(`/artists/${artistId}/unfollow`);
    } catch (error) {
      Alert.alert('エラー', 'アンフォローに失敗しました');
      // 失敗したら画面を元に戻す
      setFollowingIds(prevIds => new Set(prevIds).add(artistId));
    }
  };

  // 9. ★ アーティストごとのアイテム
  const renderArtistItem = ({ item }: { item: Artist }) => {
    const isFollowing = followingIds.has(item.id);

    return (
      <View style={styles.artistItem}>
        <View style={styles.artistInfo}>
          {/* (将来ここにアバター画像 <Image />) */}
          <Text style={styles.artistName}>{item.name}</Text>
        </View>

        {/* 10. ★ フォロー/アンフォローボタン */}
        {/* (自分自身がアーティストの場合はフォローボタンを非表示) */}
        {user?.role === 'user' && (
          <View style={styles.buttonContainer}>
            {isFollowing ? (
              <Button
                title="フォロー中"
                onPress={() => handleUnfollow(item.id)}
                color="#888" // フォロー中はグレー
              />
            ) : (
              <Button
                title="フォローする"
                onPress={() => handleFollow(item.id)}
                color="#0A84FF" // フォロー前は青
              />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FFFFFF"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={artists}
          renderItem={renderArtistItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>登録アーティストがいません</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  artistItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    minWidth: 110,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});

export default ArtistListScreen;
