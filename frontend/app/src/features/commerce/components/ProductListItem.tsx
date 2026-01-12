import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Button,
} from 'react-native';
import { Product } from '../../../api/queries';

type ProductListItemProps = {
  item: Product;
  currentUserId?: number; // ログインユーザーのID
  userRole?: string; // ログインユーザーのロール
  onPress: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
};

const ProductListItem: React.FC<ProductListItemProps> = ({
  item,
  currentUserId,
  userRole,
  onPress,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  // ★ 修正ポイント: ID比較を厳密かつ柔軟に行う
  // APIによってはIDが文字列で来る場合があるため、String()で型を揃えて比較します
  const isOwner =
    currentUserId !== undefined &&
    item.artist?.id !== undefined &&
    String(item.artist.id) === String(currentUserId);

  const isAdmin = userRole === 'admin';

  // 編集権限: 管理者 または 所有者のみ
  const canEdit = isAdmin || isOwner;

  // いいねボタン表示: 自分の商品以外
  const showLikeButton = !isOwner;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={styles.container}
    >
      <View style={styles.productItem}>
        {/* 左側：画像 */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder]} />
        )}

        {/* 右側：情報エリア */}
        <View style={styles.productInfo}>
          {item.artist && (
            <Text style={styles.organizerNameSimple} numberOfLines={1}>
              {item.artist.nickname} presents
            </Text>
          )}

          <View style={styles.headerRow}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>

            {/* いいねボタン */}
            {showLikeButton && (
              <TouchableOpacity
                style={styles.heartButton}
                onPress={() => onToggleFavorite(item)}
              >
                <View style={styles.heartContainer}>
                  <Text style={styles.heartIcon}>
                    {item.is_liked ? '❤️' : '🤍'}
                  </Text>
                  <Text style={styles.likeCountText}>
                    {item.likes_count || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* 価格と在庫 */}
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              ¥{item.price.toLocaleString()}
            </Text>
            <Text style={styles.productStock}>/ 在庫: {item.stock}</Text>
          </View>
        </View>

        {/* 編集・削除ボタンエリア */}
        {canEdit && (
          <View style={styles.adminButtonContainer}>
            <Button
              title="編集"
              color="#0A84FF"
              onPress={e => {
                e.stopPropagation(); // 親のonPressを発火させない
                onEdit(item);
              }}
            />
            <View style={{ marginTop: 8 }}>
              <Button
                title="削除"
                color="#FF3B30"
                onPress={e => {
                  e.stopPropagation();
                  onDelete(item);
                }}
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  productItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    height: 120,
  },
  productImage: {
    width: 100,
    height: '100%',
    backgroundColor: '#333',
    resizeMode: 'cover',
  },
  imagePlaceholder: { width: 100, height: '100%', backgroundColor: '#333' },
  productInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  organizerNameSimple: {
    color: '#FF9F0A',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
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
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  productStock: {
    fontSize: 12,
    color: '#888888',
  },
  adminButtonContainer: {
    paddingRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#333',
    paddingLeft: 10,
    height: '100%',
  },
  heartButton: {
    padding: 0,
  },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  heartIcon: {
    fontSize: 18,
  },
  likeCountText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -2,
  },
});

export default ProductListItem;
