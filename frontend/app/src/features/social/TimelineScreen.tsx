import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image, // 1. ★ Image をインポート
  TouchableOpacity, // 2. ★ TouchableOpacity をインポート
  Alert, // 3. ★ Alert をインポート
} from 'react-native';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  useQuery,
  useMutation,
  useQueryClient, // キャッシュを手動で更新するためにインポート
} from '@tanstack/react-query';
import { Post, fetchPosts } from '../../api/queries';

// 4. ★★★ PostItem コンポーネントを修正 ★★★
const PostItem = ({
  post,
  onPress,
  user, // 5. ★ ログイン中のユーザー情報を受け取る
  onEdit, // 6. ★ 編集ボタン用の関数を受け取る
  onDelete, // 7. ★ 削除ボタン用の関数を受け取る
}: {
  post: Post;
  onPress: () => void;
  user: any | null; // ログインしていない場合は null
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const postDate = new Date(post.created_at).toLocaleDateString('ja-JP');

  // 8. ★ 投稿者本人 or 管理者 かどうかを判定
  const isOwnerOrAdmin =
    user && (user.id === post.user.id || user.role === 'admin');

  return (
    // カード全体をタップ可能に
    <TouchableOpacity style={styles.postContainer} onPress={onPress}>
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} />
      )}

      <View style={styles.textContainer}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <View style={styles.metadataContainer}>
          <Text style={styles.postUser}>
            {post.user.nickname || '不明なユーザー'}
          </Text>
          <Text style={styles.postDate}>{postDate}</Text>
        </View>
      </View>

      {/* 9. ★ (NEW) 編集・削除ボタンをここに追加 */}
      {isOwnerOrAdmin && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={onEdit}
            style={[styles.adminButton, styles.editButton]}
          >
            <Text style={styles.adminButtonText}>編集</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={[styles.adminButton, styles.deleteButton]}
          >
            <Text style={styles.adminButtonText}>削除</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const TimelineScreen = () => {
  // 10. ★ useAuth と useNavigation を呼び出し
  const { user } = useAuth(); // ログイン中のユーザーを取得
  const navigation = useNavigation<any>(); // 編集画面への遷移用

  const queryClient = useQueryClient();

  // 8. ★★★ (NEW) useQuery フック ★★★
  // これが useState, loading, fetching, useFocusEffect の代わり
  const {
    data: posts, // 👈 'posts' state の代わり
    isLoading, // 👈 'loading' state の代わり
    isRefetching, // 👈 'refreshing' state の代わり
    refetch, // 👈 'onRefresh' で呼び出す関数
    isError, // 👈 (NEW) エラーハンドリング用
  } = useQuery({
    queryKey: ['posts'], // 👈 キャッシュの「名前（キー）」
    queryFn: fetchPosts, // 👈 データを取得する「使い回せる」関数
    // (useFocusEffect と同じく、タブ切り替えで自動的に再検証されます)
  });

  // 9. ★ (NEW) 削除ボタンの処理 (useMutation) ★★★
  // useMutation は「データを変更する」操作（POST, PUT, DELETE）に使います
  const deleteMutation = useMutation({
    mutationFn: (postId: number) => {
      // (A) APIを呼び出す
      return api.delete(`/posts/${postId}`);
    },
    // (B) 成功した場合
    onSuccess: (data, postId) => {
      // (C) キャッシュ ('posts') を手動で更新し、UIから即時削除
      queryClient.setQueryData(['posts'], (oldData: Post[] | undefined) => {
        return oldData ? oldData.filter(p => p.id !== postId) : [];
      });
      Alert.alert('成功', '投稿を削除しました。');
    },
    // (D) 失敗した場合
    onError: (error: any) => {
      Alert.alert(
        'エラー',
        '削除に失敗しました: ' +
          (error.response?.data?.message || error.message),
      );
    },
  });

  // 10. ★ handleDelete 関数を、useMutation を呼び出すように変更
  const handleDelete = useCallback(
    // 👈 ★★★ これだけを残す
    (postId: number) => {
      Alert.alert('投稿の削除', '本当にこの投稿を削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(postId), // 👈 useMutation を呼ぶ
        },
      ]);
    },
    [deleteMutation],
  );

  const handlePostPress = (post: Post) => {
    // ★ (NEW) PostDetailScreen に 'post' オブジェクトを渡して遷移
    navigation.navigate('PostDetail', { post: post });
  };

  // 12. ★ (NEW) 編集ボタンの処理
  const handleEdit = useCallback(
    (post: Post) => {
      navigation.navigate('PostEdit', { post: post });
    },
    [navigation],
  );

  // 11. ★ ローディング判定を 'isLoading' に変更
  // (isRefetching は「裏での更新」なので、クルクルは出さない)
  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // 12. ★ エラー表示を追加
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
        // 13. ★ renderItem を修正
        renderItem={({ item }) => (
          <PostItem
            post={item}
            onPress={() => handlePostPress(item)}
            user={user} // 👈 ログイン中ユーザーを渡す
            onEdit={() => handleEdit(item)} // 👈 編集関数を渡す
            onDelete={() => handleDelete(item.id)} // 👈 削除関数を渡す
          />
        )}
        ListEmptyComponent={
          // 9. ★「リフレッシュ中」は「投稿はありません」を隠す
          !isRefetching  ? (
            <View style={[styles.container, styles.center]}>
              <Text style={styles.emptyText}>投稿はまだありません。</Text>
            </View>
          ) : null
        }
        refreshControl={
          // 14. ★ refreshing を 'isRefetching' に、onRefresh を 'refetch' に変更
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch} // 👈 React Query の refetch 関数を呼ぶ
            tintColor="#FFFFFF"
          />
        }
      />
    </SafeAreaView>
  );
};

// 10. ★★★ スタイルをダークモード＆カードUI用に全面改修 ★★★
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // 👈 ダークモード背景
  },
  center: {
    flex: 1, // 👈 flex: 1 を追加
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888', // 👈 テキスト色
  },
  // --- PostItem のスタイル ---
  postContainer: {
    backgroundColor: '#1C1C1E', // カード背景色
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    // 影 (オプション)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden', // 👈 Image を角丸にするため
  },
  postImage: {
    width: '100%',
    height: 180, // 画像の高さを固定
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 15,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // 白文字
    marginBottom: 10,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postUser: {
    fontSize: 12,
    color: '#888', // メタデータの色
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // ボタンを右寄せ
    borderTopWidth: 1,
    borderTopColor: '#333', // 区切り線
    padding: 10,
  },
  adminButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#0A84FF', // 青 (編集)
  },
  deleteButton: {
    backgroundColor: '#FF3B30', // 赤 (削除)
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default TimelineScreen;
