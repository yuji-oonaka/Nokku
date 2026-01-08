import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Button,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Artist, ArtistListResponse } from '../../../api/queries';
import { useAuth } from '../../../context/AuthContext';

interface Props {
  artist: Artist;
  isFollowing: boolean;
  searchQueryKey: readonly unknown[]; // 親のクエリキーを受け取り、キャッシュ更新に使用
  onPress: (artist: Artist) => void;
}

const ArtistItem = memo(
  ({ artist, isFollowing, searchQueryKey, onPress }: Props) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // --- Follow Mutation ---
    const followMutation = useMutation({
      mutationFn: () => api.post(`/artists/${artist.id}/follow`),
      onMutate: async () => {
        // 楽観的更新: 親のリストキャッシュを直接書き換える
        await queryClient.cancelQueries({ queryKey: searchQueryKey });
        const previousData =
          queryClient.getQueryData<ArtistListResponse>(searchQueryKey);

        if (previousData) {
          queryClient.setQueryData<ArtistListResponse>(searchQueryKey, {
            ...previousData,
            following_ids: [...previousData.following_ids, artist.id],
          });
        }
        return { previousData };
      },
      onError: (_err, _vars, context) => {
        Alert.alert('エラー', 'フォローに失敗しました');
        if (context?.previousData) {
          queryClient.setQueryData(searchQueryKey, context.previousData);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: searchQueryKey });
      },
    });

    // --- Unfollow Mutation ---
    const unfollowMutation = useMutation({
      mutationFn: () => api.delete(`/artists/${artist.id}/unfollow`),
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: searchQueryKey });
        const previousData =
          queryClient.getQueryData<ArtistListResponse>(searchQueryKey);

        if (previousData) {
          queryClient.setQueryData<ArtistListResponse>(searchQueryKey, {
            ...previousData,
            following_ids: previousData.following_ids.filter(
              id => id !== artist.id,
            ),
          });
        }
        return { previousData };
      },
      onError: (_err, _vars, context) => {
        Alert.alert('エラー', 'アンフォローに失敗しました');
        if (context?.previousData) {
          queryClient.setQueryData(searchQueryKey, context.previousData);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: searchQueryKey });
      },
    });

    const handleToggleFollow = () => {
      if (isFollowing) {
        unfollowMutation.mutate();
      } else {
        followMutation.mutate();
      }
    };

    const isPending = followMutation.isPending || unfollowMutation.isPending;

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.infoWrapper}
          onPress={() => onPress(artist)}
          activeOpacity={0.7}
        >
          {/* アバター画像 */}
          {artist.image_url ? (
            <Image source={{ uri: artist.image_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}

          <View style={styles.textContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {artist.nickname}
            </Text>
            {/* bioがあれば表示するなども可 */}
          </View>
        </TouchableOpacity>

        {/* ユーザー自身がアーティストでない場合のみフォローボタン表示 */}
        {user?.role === 'user' && (
          <View style={styles.buttonContainer}>
            <Button
              title={isFollowing ? 'フォロー中' : 'フォローする'}
              onPress={handleToggleFollow}
              color={isFollowing ? '#888' : '#0A84FF'}
              disabled={isPending}
            />
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    padding: 12,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#555',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    minWidth: 100,
  },
});

export default ArtistItem;
