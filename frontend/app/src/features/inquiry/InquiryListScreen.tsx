import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchMyInquiries, Inquiry } from '../../api/queries';
import { StackNavigationProp } from '@react-navigation/stack';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';

type NavigationProp = StackNavigationProp<MyPageStackParamList>;

const InquiryListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInquiries = async () => {
    try {
      const data = await fetchMyInquiries();
      setInquiries(data);
    } catch (error) {
      console.error('問い合わせ履歴の取得失敗:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInquiries();
    }, []),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadInquiries();
  };

  const renderStatusBadge = (status: string) => {
    let color = '#8E8E93';
    let text = '未対応';

    switch (status) {
      case 'open':
        color = '#0A84FF';
        text = '受付済';
        break;
      case 'in_review':
        color = '#FF9F0A';
        text = '対応中';
        break;
      case 'closed':
        color = '#30D158';
        text = '解決済';
        break;
    }

    return (
      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.badgeText, { color: color }]}>{text}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Inquiry }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        // @ts-ignore
        navigation.navigate('InquiryDetail', { inquiryId: item.id });
      }}
    >
      <View style={styles.headerRow}>
        <View style={styles.statusRow}>
          {renderStatusBadge(item.status)}
          {item.is_escalated && (
            <View style={[styles.badge, styles.escalatedBadge]}>
              <Text style={styles.escalatedText}>運営対応</Text>
            </View>
          )}
        </View>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.subject} numberOfLines={1}>
        {item.subject}
      </Text>
      <Text style={styles.message} numberOfLines={2}>
        {item.message}
      </Text>
    </TouchableOpacity>
  );

  // ★ 新設: リストのヘッダー部分（ここをメインにする）
  const ListHeader = () => (
    <View style={styles.headerComponent}>
      <Text style={styles.pageTitle}>サポートセンター</Text>
      <Text style={styles.pageDesc}>
        お困りのことや、不具合の報告はこちらからご連絡ください。
      </Text>

      {/* 目立つ新規作成ボタン */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          // @ts-ignore
          navigation.navigate('InquiryCreate');
        }}
      >
        <Text style={styles.createButtonText}>＋ 新しく問い合わせる</Text>
      </TouchableOpacity>

      <Text style={styles.historyTitle}>過去のお問い合わせ履歴</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={inquiries}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
          />
        }
        // ★ ヘッダーを追加
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>お問い合わせ履歴はありません</Text>
          </View>
        }
      />
      {/* FABは削除しました */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // ★ ヘッダー用スタイル
  headerComponent: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  pageDesc: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#0A84FF', // ブランドカラー
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0A84FF',
    paddingLeft: 10,
  },
  // 以下、既存のアイテムスタイル
  itemContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  date: {
    color: '#8E8E93',
    fontSize: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  escalatedBadge: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  escalatedText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subject: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    color: '#C7C7CC',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
  },
});

export default InquiryListScreen;
