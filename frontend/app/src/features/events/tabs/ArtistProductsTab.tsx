import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { ArtistProductMin } from '../../../api/queries';

interface Props {
  data: ArtistProductMin[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onPress: (productId: number) => void;
}

const ArtistProductsTab = ({
  data,
  isRefreshing,
  onRefresh,
  onPress,
}: Props) => {
  const renderItem = ({ item }: { item: ArtistProductMin }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => onPress(item.id)}>
      <View style={styles.productRow}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productPlaceholder]} />
        )}
        <View style={styles.productInfo}>
          <Text style={styles.listText}>{item.name}</Text>
          <Text style={styles.subText}>¥{item.price.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={data.length === 0 ? styles.flexCenter : undefined}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>グッズはありません</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  flexCenter: { flex: 1 },
  listItem: {
    backgroundColor: '#1C1C1E',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 15,
    backgroundColor: '#333',
  },
  productPlaceholder: { backgroundColor: '#333' },
  productInfo: { flex: 1, justifyContent: 'center' },
  listText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: { color: '#888', fontSize: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: { color: '#888', fontSize: 16 },
});

export default ArtistProductsTab;
