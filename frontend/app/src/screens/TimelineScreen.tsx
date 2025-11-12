import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

// 投稿データの型定義
interface User {
  id: number;
  nickname: string;
}

interface Post {
  id: number;
  content: string;
  image_url: string | null;
  created_at: string; // 日付は文字列として受け取る
  user: User; // 投稿者情報
}

// 投稿アイテムのコンポーネント
const PostItem = ({ post }: { post: Post }) => {
  return (
    <View style={styles.postContainer}>
      <Text style={styles.postUser}>
        {post.user.nickname || '不明なユーザー'}
      </Text>
      <Text style={styles.postContent}>{post.content}</Text>
      {/* TODO: image_url があれば画像を表示 */}
      <Text style={styles.postDate}>
        {new Date(post.created_at).toLocaleString('ja-JP')}
      </Text>
    </View>
  );
};

const TimelineScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // TODO: ページネーション (page, setPage)

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts'); // APIから投稿一覧を取得
      setPosts(response.data.data); // ページネーション対応 (response.data.data)
    } catch (error) {
      console.error('投稿の取得に失敗しました:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 1. 初回読み込み (useFocusEffectでタブ切り替え時にも再取得)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPosts();
    }, []),
  );

  // 2. 引っ張って更新
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <PostItem post={item} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>投稿はまだありません。</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        // TODO: onEndReached (無限スクロール)
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5', // 少し色を付ける
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postUser: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  postDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
    textAlign: 'right',
  },
});

export default TimelineScreen;
