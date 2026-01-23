import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal, // ★重要: 図鑑を開くための画面機能
  SafeAreaView,
} from 'react-native';
// フックとAPI型定義
import { useGacha } from '../hooks/useGacha';
import { Gacha } from '../../../api/gacha';

// ★重要: ユーザー情報を再取得するためのフック
// (パスはあなたの AuthContext の場所に合わせる必要があります)
import { useAuth } from '../../../context/AuthContext';

// ★重要: あなたがさっき作った「図鑑」ファイルをここで読み込みます！
import InventoryScreen from './InventoryScreen';

const GachaScreen = () => {
  const { loading, gachaList, loadGachas, spin } = useGacha();

  // ポイント更新用
  const { user, refreshUser } = useAuth(); // AuthContextの実装に合わせてください

  // ★重要: 図鑑モーダルを開いているかどうかを管理するスイッチ
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    loadGachas();
  }, [loadGachas]);

  // ガチャ実行処理
  const handlePressSpin = (gacha: Gacha) => {
    Alert.alert(
      'ガチャ確認',
      `${gacha.name}\n${gacha.consumption_point}pt を消費して回しますか？`,
      [
        { text: 'やめる', style: 'cancel' },
        {
          text: '回す！',
          onPress: async () => {
            const response = await spin(gacha.id);

            if (response) {
              const { item, is_duplicate, refund_amount } = response.result;

              // ポイント更新
              if (refreshUser) {
                await refreshUser();
              }

              const title = is_duplicate ? 'ダブり！(還元)' : '獲得！';
              const message = is_duplicate
                ? `${item.name} は既に持っています。\n${refund_amount}pt が返却されました。`
                : `${item.name} (${item.rarity}) を手に入れました！`;

              Alert.alert(title, message);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Gacha }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.point}>{item.consumption_point} pt</Text>
      </View>
      <Text style={styles.description}>{item.description}</Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => handlePressSpin(item)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '通信中...' : 'ガチャを回す'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>ガチャ一覧</Text>

      {/* ▼▼▼ これが表示されていないボタンです！ ▼▼▼ */}
      <TouchableOpacity
        style={styles.inventoryButton}
        onPress={() => setShowInventory(true)}
      >
        <Text style={styles.inventoryButtonText}>
          🎁 所持アイテム図鑑を見る
        </Text>
      </TouchableOpacity>
      {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

      {loading && gachaList.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      ) : (
        <FlatList
          data={gachaList}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadGachas}
        />
      )}

      {/* ▼▼▼ 図鑑を表示するモーダル画面 ▼▼▼ */}
      <Modal
        visible={showInventory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInventory(false)}
            >
              <Text style={styles.closeButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
          {/* ここであなたの作った InventoryScreen を表示します */}
          <InventoryScreen />
        </View>
      </Modal>
      {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
  },
  // ★ボタンのスタイル（これが無いと表示が崩れます）
  inventoryButton: {
    backgroundColor: '#FF6B00', // オレンジ色
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  inventoryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // ★モーダルのスタイル
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    padding: 16,
    alignItems: 'flex-end',
    backgroundColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 既存スタイル
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  point: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GachaScreen;
