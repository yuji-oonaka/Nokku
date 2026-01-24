import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { fetchUserItems, UserItem } from '../../../api/user';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

// ★型定義: あいまいにせず、モードを必須にします
type Props =
  // ケース1: プロフィール編集画面から呼ばれる (選択して親に返す)
  | { mode: 'select'; onSelect: (item: UserItem) => void }
  // ケース2: 図鑑/ガチャ画面から呼ばれる (その場でAPIを叩いて更新)
  | { mode: 'equip'; onSelect?: never };

const InventoryScreen: React.FC<Props> = props => {
  const { user, refreshUser } = useAuth(); // 現在の装備状態を取得
  const queryClient = useQueryClient();

  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<UserItem | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await fetchUserItems();
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  // アイコン変更実行
  const handleConfirmSelect = async () => {
    if (!detailItem) return;

    // ▼▼▼ ケース1: プロフィール編集画面での利用 ▼▼▼
    if (props.mode === 'select') {
      props.onSelect(detailItem);
      setDetailItem(null);
    }
    // ▼▼▼ ケース2: 図鑑からの直接更新 (ここが今回動かしたい部分) ▼▼▼
    else if (props.mode === 'equip') {
      try {
        // 1. バックエンドのAPIを叩く (Route/Controller修正済み)
        await api.patch('/user/icon', {
          current_icon_id: detailItem.id,
        });

        // 2. 成功したらアプリ内のキャッシュを更新して、表示を即座に変える
        await refreshUser();

        Alert.alert(
          '変更完了',
          `アイコンを「${detailItem.name}」に変更しました！`,
        );
        setDetailItem(null);
      } catch (error: any) {
        console.error('Equip Error:', error);
        Alert.alert('エラー', 'アイコンの変更に失敗しました。');
      }
    }
  };

  // 現在装備中かどうかの判定 (user?.current_icon_id は AuthContext で定義済みとする)
  const isEquipped = user?.current_icon_id === detailItem?.id;

  const renderItem = ({ item }: { item: UserItem }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => setDetailItem(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.image_url }} style={styles.image} />
      {/* 装備中なら枠線などで強調してもOK */}
      {user?.current_icon_id === item.id && (
        <View style={styles.equippedListBadge} />
      )}
      <View
        style={[styles.badge, { backgroundColor: getRarityColor(item.rarity) }]}
      >
        <Text style={styles.badgeText}>{item.rarity}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'UR':
        return '#FF0000';
      case 'SSR':
        return '#FFD700';
      case 'SR':
        return '#800080';
      case 'R':
        return '#0000FF';
      default:
        return '#FF6B00';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {props.mode === 'select' ? 'アイコンを選択' : '所持アイコン一覧'}(
        {items.length})
      </Text>

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
          numColumns={3}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>アイテムがありません</Text>
          }
        />
      )}

      {/* 詳細モーダル */}
      <Modal
        visible={!!detailItem}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailContainer}>
            {detailItem && (
              <>
                <Text style={styles.detailTitle}>{detailItem.name}</Text>

                <View
                  style={[
                    styles.detailImageWrapper,
                    { borderColor: getRarityColor(detailItem.rarity) },
                  ]}
                >
                  <Image
                    source={{ uri: detailItem.image_url }}
                    style={styles.detailImage}
                  />
                </View>

                <View
                  style={[
                    styles.detailBadge,
                    { backgroundColor: getRarityColor(detailItem.rarity) },
                  ]}
                >
                  <Text style={styles.detailBadgeText}>
                    {detailItem.rarity}
                  </Text>
                </View>

                <View style={styles.buttonArea}>
                  {isEquipped ? (
                    <View style={styles.equippedBadge}>
                      <Text style={styles.equippedText}>設定中</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.equipButton}
                      onPress={handleConfirmSelect}
                    >
                      <Text style={styles.equipButtonText}>これに着替える</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setDetailItem(null)}
                  >
                    <Text style={styles.closeButtonText}>閉じる</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20, backgroundColor: '#000' }, // 背景色追加
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  list: { paddingHorizontal: 10, paddingBottom: 40 },
  gridItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    padding: 10,
    maxWidth: '31%',
    borderWidth: 1,
    borderColor: '#444',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    backgroundColor: '#555',
  },
  name: { color: '#fff', fontSize: 10, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 50 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContainer: {
    width: '85%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  detailTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailImageWrapper: {
    borderWidth: 3,
    borderRadius: 75,
    padding: 4,
    marginBottom: 15,
  },
  detailImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#555',
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonArea: { width: '100%', gap: 12 },
  equipButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  equipButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#333',
  },
  closeButtonText: { color: '#fff', fontSize: 16 },
  equippedBadge: {
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4EA8DE',
  },
  equippedText: { color: '#4EA8DE', fontWeight: 'bold', fontSize: 16 },
  equippedListBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#0A84FF',
    borderRadius: 8,
    zIndex: 1,
  },
});

export default InventoryScreen;
