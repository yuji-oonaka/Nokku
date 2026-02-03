import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';
import { useQuery } from '@tanstack/react-query';
import { Order, fetchMyOrders } from '../../api/queries';

// 作成したコンポーネントをインポート
import OrderHistoryItem from './components/OrderHistoryItem';

type OrderHistoryNavigationProp = StackNavigationProp<
  MyPageStackParamList,
  'OrderHistory'
>;

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation<OrderHistoryNavigationProp>();

  const {
    data: orders,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['myOrders', 'product'], // queryKey も分けておくのが定石
    queryFn: () => fetchMyOrders('product'), // ★ 'product' を指定して呼び出す
    staleTime: 1000 * 60 * 3,
  });

  const onRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  // ハンドラー: アイテムタップ時
  const handleOrderPress = (order: Order) => {
    navigation.navigate('OrderDetail', { order });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>注文履歴の取得に失敗しました。</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders || []}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <OrderHistoryItem item={item} onPress={handleOrderPress} />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>グッズの購入履歴はありません</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#7C4DFF']}
          />
        }
      />
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
    padding: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  retryText: {
    color: '#FFF',
  },
});

export default OrderHistoryScreen;
