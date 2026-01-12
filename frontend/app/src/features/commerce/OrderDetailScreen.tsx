import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';

// 作成したHookとComponent
import { useOrderRedemption } from './hooks/useOrderRedemption';
import OrderQRCodeSection from './components/OrderQRCodeSection';
import OrderBasicInfo from './components/OrderBasicInfo';
import OrderShippingInfo from './components/OrderShippingInfo';
import OrderItemsList from './components/OrderItemsList';

type OrderDetailRouteProp = RouteProp<MyPageStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC = () => {
  const route = useRoute<OrderDetailRouteProp>();
  const { order: initialOrder } = route.params;

  // Firestore監視ロジックをHookに委譲
  const order = useOrderRedemption(initialOrder);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* QRコードセクション (会場受取時のみ表示) */}
        <OrderQRCodeSection order={order} />

        {/* 配送先情報 (郵送時のみ表示) */}
        <OrderShippingInfo order={order} />

        {/* 基本情報 (ステータス等) */}
        <OrderBasicInfo order={order} />

        {/* 注文明細 */}
        <OrderItemsList order={order} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 40 },
});

export default OrderDetailScreen;
