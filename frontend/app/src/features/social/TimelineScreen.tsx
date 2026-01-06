import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../../services/api'; // パスは適宜調整
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext'; // パスは適宜調整
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Post, fetchPosts } from '../../api/queries'; // パスは適宜調整

// ★ ここで切り出したコンポーネントをインポート
// （パスが赤い波線になったら、VS Codeの修正機能で直してください）
import { PostItem } from './components/PostItem';

const TimelineScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  // --- データ取得 ---
  const {
    data: posts,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  // --- 削除処理 ---
  const deleteMutation = useMutation({
    mutationFn: (postId: number) => {
      return api.delete(`/posts/${postId}`);
    },
    onSuccess: (data, postId) => {
      queryClient.setQueryData(['posts'], (oldData: Post[] | undefined) => {
        return oldData ? oldData.filter(p => p.id !== postId) : [];
      });
      Alert.alert('成功', '投稿を削除しました。');
    },
    onError: (error: any) => {
      Alert.alert(
        'エラー',
        '削除に失敗しました: ' +
          (error.response?.data?.message || error.message),
      );
    },
  });

  // --- ハンドラー関数（useCallbackで固定化） ---

  // 削除ボタン用
  const handleDelete = useCallback(
    (postId: number) => {
      Alert.alert('投稿の削除', '本当にこの投稿を削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(postId),
        },
      ]);
    },
    [deleteMutation],
  );

  // 編集ボタン用
  const handleEdit = useCallback(
    (post: Post) => {
      navigation.navigate('PostEdit', { post: post });
    },
    [navigation],
  );

  // 詳細画面遷移用
  const handlePostPress = useCallback(
    (post: Post) => {
      navigation.navigate('PostDetail', { post: post });
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>投稿の読み込みに失敗しました。</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts || []}
        keyExtractor={item => item.id.toString()}
        // ★★★ ここが重要変更点 ★★★
        // 関数を直接渡すことで、PostItem側の React.memo が効くようになります
        renderItem={({ item }) => (
          <PostItem
            post={item}
            user={user}
            onPress={handlePostPress}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          !isRefetching ? (
            <View style={[styles.container, styles.center]}>
              <Text style={styles.emptyText}>投稿はまだありません。</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FFFFFF"
          />
        }
      />
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
  emptyText: {
    color: '#888',
  },
  // PostItem用のスタイルは削除しました
});

export default TimelineScreen;
