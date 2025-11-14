import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimelineStackParamList } from '../navigators/TimelineStackNavigator'; // 1. ★ 型をインポート

// 2. ★ 型定義
type PostDetailRouteProp = RouteProp<TimelineStackParamList, 'PostDetail'>;

const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailRouteProp>();
  const { post } = route.params; // 3. ★ TimelineScreen から 'post' オブジェクトを受け取る

  // 日付を 'toLocaleString' (2025/11/13 17:00:00 形式) に
  const postDate = new Date(post.created_at).toLocaleString('ja-JP');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 4. ★ 画像 (あれば) */}
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.image} />
        )}

        <View style={styles.contentContainer}>
          {/* 5. ★ タイトル */}
          <Text style={styles.title}>{post.title}</Text>

          {/* 6. ★ メタデータ (投稿者・日時) */}
          <View style={styles.metadataContainer}>
            <Text style={styles.user}>{post.user.nickname}</Text>
            <Text style={styles.date}>{postDate}</Text>
          </View>

          {/* 7. ★ 本文 (content) */}
          <Text style={styles.content}>{post.content}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 8. ★ スタイル (ダークモード)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    lineHeight: 26, // 本文の行間
  },
});

export default PostDetailScreen;
