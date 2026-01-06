import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
// ★ パスは環境に合わせて調整してください（../../api/queries かもしれません）
import { Post } from '../../../api/queries';

interface PostItemProps {
  post: Post;
  user: any; // 本来は User 型推奨
  onPress: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDelete: (postId: number) => void;
}

// ★ React.memo で囲むことで、リスト更新時の無駄な再レンダリングを防ぐ
export const PostItem = React.memo(
  ({ post, user, onPress, onEdit, onDelete }: PostItemProps) => {
    const postDate = new Date(post.created_at).toLocaleDateString('ja-JP');

    // 投稿者本人 or 管理者 かどうかを判定
    const isOwnerOrAdmin =
      user && (user.id === post.user.id || user.role === 'admin');

    return (
      <TouchableOpacity
        style={styles.postContainer}
        onPress={() => onPress(post)}
      >
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

        {/* 編集・削除ボタン */}
        {isOwnerOrAdmin && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => onEdit(post)}
              style={[styles.adminButton, styles.editButton]}
            >
              <Text style={styles.adminButtonText}>編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(post.id)}
              style={[styles.adminButton, styles.deleteButton]}
            >
              <Text style={styles.adminButtonText}>削除</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

// スタイル定義（TimelineScreenから移動）
const styles = StyleSheet.create({
  postContainer: {
    backgroundColor: '#1C1C1E',
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 15,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postUser: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 10,
  },
  adminButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#0A84FF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
