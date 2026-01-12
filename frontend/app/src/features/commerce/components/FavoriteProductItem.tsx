import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Product } from '../../../api/queries';

type FavoriteProductItemProps = {
  item: Product;
  onPress: (product: Product) => void;
  onToggleFavorite: (productId: number) => void;
};

const FavoriteProductItem: React.FC<FavoriteProductItemProps> = ({
  item,
  onPress,
  onToggleFavorite,
}) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={styles.container}
    >
      <View style={styles.productItem}>
        {/* 商品画像 */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.placeholder]} />
        )}

        <View style={styles.productInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>

            {/* ハートボタン */}
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => onToggleFavorite(item.id)}
            >
              <View style={styles.heartContainer}>
                <Text style={styles.heartIcon}>
                  {item.is_liked ? '❤️' : '🤍'}
                </Text>
                <Text style={styles.likeCountText}>{item.likes_count}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.productPrice}>
            ¥{item.price.toLocaleString()}
          </Text>
          <Text style={styles.productStock}>
            {item.stock > 0 ? `在庫: ${item.stock}` : '在庫切れ'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  productItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    height: 80,
  },
  productImage: { width: 80, height: '100%', resizeMode: 'cover' },
  placeholder: { backgroundColor: '#333' },
  productInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  productPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  productStock: { fontSize: 12, color: '#888', marginTop: 2 },
  heartButton: { padding: 0 },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  heartIcon: { fontSize: 18 },
  likeCountText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -2,
  },
});

export default FavoriteProductItem;
