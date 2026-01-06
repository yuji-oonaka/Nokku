import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { TimelineStackParamList } from '../../navigators/TimelineStackNavigator';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { fetchPostById } from '../../api/queries';

type PostDetailRouteProp = RouteProp<TimelineStackParamList, 'PostDetail'>;

const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 前画面から渡された初期データ
  const { post: initialPost } = route.params;

  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // データ取得
  const {
    data: post,
    isLoading,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['post', initialPost.id],
    queryFn: () => fetchPostById(initialPost.id),
    initialData: initialPost, // 即座に表示
    refetchOnWindowFocus: true,
  });

  // 削除機能
  const deleteMutation = useMutation({
    mutationFn: (postId: number) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      // キャッシュを更新して一覧画面に戻る
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      Alert.alert('成功', '投稿を削除しました', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        'エラー',
        '削除に失敗しました: ' +
          (error.response?.data?.message || error.message),
      );
    },
  });

  const handleDelete = () => {
    Alert.alert('確認', '本当にこの投稿を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(initialPost.id),
      },
    ]);
  };

  const handleEdit = () => {
    // 編集画面へ遷移（PostEditScreenが必要）
    navigation.navigate('PostEdit', { post });
  };

  const onRefresh = useCallback(async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
    } catch (error) {
      // ignore
    }
    setIsManualRefetching(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>お知らせの取得に失敗しました。</Text>
      </View>
    );
  }

  // 日付フォーマット
  const postDate = new Date(post.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isOwner = user?.id === post.user.id || user?.role === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefetching}
            onRefresh={onRefresh}
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
            <View style={styles.authorContainer}>
              {/* アイコンがあれば表示などの拡張性あり */}
              <Text style={styles.user}>
                {post.user.nickname || '不明なユーザー'}
              </Text>
            </View>
            <Text style={styles.date}>{postDate}</Text>
          </View>

          <Text style={styles.content}>{post.content}</Text>
        </View>

        {/* 本人確認ができた場合のみ表示するアクションボタン */}
        {isOwner && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Text style={styles.actionButtonText}>編集する</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Text style={styles.actionButtonText}>削除する</Text>
            </TouchableOpacity>
          </View>
        )}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
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
    lineHeight: 32,
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
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  user: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    color: '#888888',
    fontSize: 12,
  },
  content: {
    fontSize: 16,
    color: '#DDDDDD',
    lineHeight: 28,
  },
  errorText: {
    color: '#888',
    fontSize: 16,
  },
  // アクションボタン用スタイル
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)', // 薄い赤
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default PostDetailScreen;
