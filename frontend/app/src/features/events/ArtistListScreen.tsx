import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Artist, fetchArtists } from '../../api/queries';
import ArtistItem from './components/ArtistItem'; // 新規コンポーネント

const ArtistListScreen = () => {
  const navigation = useNavigation<any>();

  // 検索ステート
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // デバウンス処理
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchQuery]);

  // Query Key を定義 (ArtistItemにも渡すため)
  const queryKey = useMemo(() => ['artists', debouncedQuery], [debouncedQuery]);

  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => fetchArtists(debouncedQuery),
    placeholderData: previousData => previousData,
    staleTime: 1000 * 60 * 1,
  });

  const artists = response?.artists || [];

  // フォロー中IDのSet化 (高速lookup用)
  const followingIds = useMemo(() => {
    return new Set(response?.following_ids || []);
  }, [response?.following_ids]);

  // コールバックのメモ化
  const handleArtistPress = useCallback(
    (artist: Artist) => {
      navigation.navigate('ArtistProfile', { artistId: artist.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Artist }) => (
      <ArtistItem
        artist={item}
        isFollowing={followingIds.has(item.id)}
        searchQueryKey={queryKey} // 子側でoptimistic updateするために必要
        onPress={handleArtistPress}
      />
    ),
    [followingIds, queryKey, handleArtistPress],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="アーティスト名で検索..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
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
          renderItem={renderItem}
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
          // パフォーマンス設定
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
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
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default ArtistListScreen;
