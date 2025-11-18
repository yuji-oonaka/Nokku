import React, { useMemo, useState, useEffect } from 'react'; // ★ useEffect を追加
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Button,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Artist, ArtistListResponse, fetchArtists } from '../api/queries';

const ArtistListScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. 入力欄の値を管理する state
  const [searchQuery, setSearchQuery] = useState('');
  // 2. ★ 実際にAPIに渡す「遅延させた」値を管理する state
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 3. ★ デバウンス処理 (入力が止まってから500ms後に debouncedQuery を更新)
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500); // 0.5秒待機

    return () => {
      clearTimeout(timerId); // 待機中に次の入力があればタイマーをリセット
    };
  }, [searchQuery]);

  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    // 4. ★ debouncedQuery をキーと引数に使う
    queryKey: ['artists', debouncedQuery],
    queryFn: () => fetchArtists(debouncedQuery),
    placeholderData: previousData => previousData,
    // キャッシュ時間を短くして、検索体験をスムーズに
    staleTime: 1000 * 60 * 1,
  });

  const artists = response?.artists || [];
  const followingIds = useMemo(() => {
    return new Set(response?.following_ids || []);
  }, [response?.following_ids]);

  const followMutation = useMutation({
    mutationFn: (artistId: number) => api.post(`/artists/${artistId}/follow`),
    onMutate: async (artistId: number) => {
      // ★ debouncedQuery を使う
      await queryClient.cancelQueries({
        queryKey: ['artists', debouncedQuery],
      });
      const previousData = queryClient.getQueryData<ArtistListResponse>([
        'artists',
        debouncedQuery,
      ]);

      if (previousData) {
        queryClient.setQueryData<ArtistListResponse>(
          ['artists', debouncedQuery],
          {
            ...previousData,
            following_ids: [...previousData.following_ids, artistId],
          },
        );
      }
      return { previousData };
    },
    onError: (err, artistId, context) => {
      Alert.alert('エラー', 'フォローに失敗しました');
      if (context?.previousData) {
        queryClient.setQueryData(
          ['artists', debouncedQuery],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['artists', debouncedQuery] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (artistId: number) =>
      api.delete(`/artists/${artistId}/unfollow`),
    onMutate: async (artistId: number) => {
      await queryClient.cancelQueries({
        queryKey: ['artists', debouncedQuery],
      });
      const previousData = queryClient.getQueryData<ArtistListResponse>([
        'artists',
        debouncedQuery,
      ]);

      if (previousData) {
        queryClient.setQueryData<ArtistListResponse>(
          ['artists', debouncedQuery],
          {
            ...previousData,
            following_ids: previousData.following_ids.filter(
              id => id !== artistId,
            ),
          },
        );
      }
      return { previousData };
    },
    onError: (err, artistId, context) => {
      Alert.alert('エラー', 'アンフォローに失敗しました');
      if (context?.previousData) {
        queryClient.setQueryData(
          ['artists', debouncedQuery],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['artists', debouncedQuery] });
    },
  });

  const handleFollow = (artistId: number) => {
    followMutation.mutate(artistId);
  };
  const handleUnfollow = (artistId: number) => {
    unfollowMutation.mutate(artistId);
  };

  const handleArtistPress = (artist: Artist) => {
    navigation.navigate('ArtistProfile', { artistId: artist.id });
  };

  const renderArtistItem = ({ item }: { item: Artist }) => {
    const isFollowing = followingIds.has(item.id);
    const isPending =
      (followMutation.isPending && followMutation.variables === item.id) ||
      (unfollowMutation.isPending && unfollowMutation.variables === item.id);

    return (
      <View style={styles.artistItem}>
        <TouchableOpacity
          style={styles.artistInfoWrapper}
          onPress={() => handleArtistPress(item)}
        >
          <Text style={styles.artistName}>{item.nickname}</Text>
        </TouchableOpacity>
        {user?.role === 'user' && (
          <View style={styles.buttonContainer}>
            {isFollowing ? (
              <Button
                title="フォロー中"
                onPress={() => handleUnfollow(item.id)}
                color="#888"
                disabled={isPending}
              />
            ) : (
              <Button
                title="フォローする"
                onPress={() => handleFollow(item.id)}
                color="#0A84FF"
                disabled={isPending}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="アーティスト名で検索..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery} // ★ ここではまだAPIを呼ばない
          autoCapitalize="none"
        />
      </View>

      {isLoading && !response ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>一覧の取得に失敗しました。</Text>
        </View>
      ) : (
        <FlatList
          data={artists}
          renderItem={renderArtistItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                該当するアーティストがいません
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
            />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  searchContainer: {
    padding: 10,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchInput: {
    backgroundColor: '#333',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
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
  artistInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5,
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
    fontSize: 16,
  },
});

export default ArtistListScreen;
