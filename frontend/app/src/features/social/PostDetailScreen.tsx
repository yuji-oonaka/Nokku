import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator, // 1. ★ ActivityIndicator をインポート
  RefreshControl, // 2. ★ RefreshControl をインポート
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimelineStackParamList } from '../../navigators/TimelineStackNavigator';

// 3. ★ React Query と新しい関数をインポート
import { useQuery } from '@tanstack/react-query';
import { Post, fetchPostById } from '../../api/queries';

type PostDetailRouteProp = RouteProp<TimelineStackParamList, 'PostDetail'>;

const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailRouteProp>();
  // 4. ★ route.params からの 'post' を 'initialPost' (初期データ) として受け取る
  const { post: initialPost } = route.params;

  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // 5. ★★★ useQuery フック ★★★
  const {
    data: post,
    isLoading,
    // 3. ★ isRefetching は RefreshControl では "使わない"
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['post', initialPost.id],
    queryFn: () => fetchPostById(initialPost.id),
    initialData: initialPost,
    refetchOnWindowFocus: true,
  });

  // 4. ★ (NEW) RefreshControl が呼び出す "専用" の関数
  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true); // 👈 クルクル開始
    try {
      await refetch(); // 👈 useQuery の refetch を実行
    } catch (error) {
      // (エラーは useQuery の isError が検知)
    }
    setIsManualRefetching(false); // 👈 クルクル停止
  }, [refetch]);

  // 10. ★ データが (万が一) 無い場合のローディング/エラー処理
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (isError || !post) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.title}>お知らせの取得に失敗しました。</Text>
      </SafeAreaView>
    );
  }

  // 11. ★ post.created_at は useQuery の 'post' から取得
  const postDate = new Date(post.created_at).toLocaleString('ja-JP');

  return (
    <SafeAreaView style={styles.container}>
      {/* 12. ★ ScrollView に RefreshControl を追加 */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching} // 👈 'isManualRefetching' を渡す
            onRefresh={onRefresh} // 👈 'onRefresh' (自作した関数) を渡す
            tintColor="#FFFFFF"
          />
        }
      >
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.image} />
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.metadataContainer}>
            <Text style={styles.user}>{post.user.nickname}</Text>
            <Text style={styles.date}>{postDate}</Text>
          </View>

          <Text style={styles.content}>{post.content}</Text>
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
  // 13. ★ (NEW) 中央配置用のスタイル
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 20,
  },
  user: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    color: '#888',
    fontSize: 14,
  },
  content: {
    fontSize: 16,
    color: '#DDDDDD',
    lineHeight: 26,
  },
});

export default PostDetailScreen;
