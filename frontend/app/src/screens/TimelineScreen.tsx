import React, { useEffect, useState, useCallback } from 'react';
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
import api from '../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

// 投稿データの型定義
interface User {
  id: number;
  nickname: string;
  role?: 'user' | 'artist' | 'admin';
}

interface Post {
  id: number;
  title: string; // 4. ★ 'title' を追加
  content: string;
  image_url: string | null;
  created_at: string;
  user: User; // 投稿者情報
}

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
  user: User | null; // ログインしていない場合は null
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const postDate = new Date(post.created_at).toLocaleDateString('ja-JP');

  // 8. ★ 投稿者本人 or 管理者 かどうかを判定
  const isOwnerOrAdmin = user && (user.id === post.user.id || user.role === 'admin');

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // [・・・(ページネーションは省略)・・・]

  // 10. ★ useAuth と useNavigation を呼び出し
  const { user } = useAuth(); // ログイン中のユーザーを取得
  const navigation = useNavigation<any>(); // 編集画面への遷移用

  const fetchPosts = async (isRefresh: boolean = false) => {
    // 4. ★ 状態を明確に分離
    if (isRefresh) {
      setRefreshing(true); // 引っ張って更新
    } else {
      setLoading(true); // 初回ロード
    }

    try {
      const response = await api.get('/posts');
      setPosts(response.data.data);
    } catch (error) {
      console.error('投稿の取得に失敗しました:', error);
    } finally {
      // 5. ★ 両方の状態を必ず false に戻す
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 6. ★ useFocusEffect は「初回ロード」として 'false' を渡す
  useFocusEffect(
    useCallback(() => {
      fetchPosts(false);
    }, []),
  );
  const onRefresh = useCallback(() => {
    fetchPosts(true);
  }, []);

  const handlePostPress = (post: Post) => {
    // ★ (NEW) PostDetailScreen に 'post' オブジェクトを渡して遷移
    navigation.navigate('PostDetail', { post: post });
  };

  // 11. ★ (NEW) 削除ボタンの処理
  const handleDelete = useCallback((postId: number) => {
    Alert.alert('投稿の削除', '本当にこの投稿を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            // API (DELETE /api/posts/{id}) を呼び出し
            await api.delete(`/posts/${postId}`);

            // 成功したら、State からも即時削除
            setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
            Alert.alert('成功', '投稿を削除しました。');
          } catch (error: any) {
            Alert.alert(
              'エラー',
              '削除に失敗しました: ' +
                (error.response?.data?.message || error.message),
            );
          }
        },
      },
    ]);
  }, []); // 依存配列は空

  // 12. ★ (NEW) 編集ボタンの処理
  const handleEdit = useCallback(
    (post: Post) => {
      navigation.navigate('PostEdit', { post: post });
    },
    [navigation],
  );

  // 8. ★ ローディング判定を 'loading' のみに簡素化
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
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
          !refreshing ? (
            <View style={[styles.container, styles.center]}>
              <Text style={styles.emptyText}>投稿はまだありません。</Text>
            </View>
          ) : null
        }
        refreshControl={
          // 10. ★ refreshing の状態を RefreshControl に正しく渡す
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
