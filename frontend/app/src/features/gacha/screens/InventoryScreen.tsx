import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
// さっき作ったAPIをインポート
import { fetchUserItems, UserItem } from '../../../api/user';

const InventoryScreen = () => {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await fetchUserItems();
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: UserItem }) => (
    <View style={styles.gridItem}>
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.rarity}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>所持アイテム図鑑 ({items.length})</Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#fff"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={3} // 3列表示
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>まだ何も持っていません</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // ガチャ画面に合わせて少しダークな背景
    paddingTop: 20, // Modalの中で表示するため少し詰め気味でOK
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  gridItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    padding: 10,
    maxWidth: '31%',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    backgroundColor: '#555', // 画像読み込み前の背景色
  },
  name: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF6B00',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default InventoryScreen;
