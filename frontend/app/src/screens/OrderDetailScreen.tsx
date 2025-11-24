import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import firestore from '@react-native-firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';

import { MyPageStackParamList } from '../navigators/MyPageStackNavigator';
import SoundService from '../services/SoundService';
import { Order, OrderItem } from '../api/queries';

type OrderDetailRouteProp = RouteProp<MyPageStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC = () => {
  const route = useRoute<OrderDetailRouteProp>();
  const { order: initialOrder } = route.params;
  const queryClient = useQueryClient();

  // 表示用のState (初期値は画面遷移時のデータ)
  const [order, setOrder] = useState<Order>(initialOrder);

  // ★ 重要: 無限ループ防止用の Ref (レンダリングに影響しないフラグ)
  const isProcessedRef = useRef(false);

  useEffect(() => {
    // 監視条件のチェック
    // 既に完了している、または会場受取でない、QRがない場合は監視しない
    if (
      initialOrder.status === 'redeemed' ||
      initialOrder.delivery_method !== 'venue' ||
      !initialOrder.qr_code_id
    ) {
      return;
    }

    console.log('Firestore監視開始:', initialOrder.qr_code_id);

    const unsubscribe = firestore()
      .collection('order_status') // Backendの OrderScanController が書き込む場所
      .doc(initialOrder.qr_code_id)
      .onSnapshot(
        snapshot => {
          const data = snapshot.data();

          // ★ Refを使って、既に処理済みなら何もしない (無限ループ・多重検知防止)
          if (isProcessedRef.current) return;

          if (data?.status === 'redeemed') {
            console.log('受取検知: 処理を開始します');

            // 1. フラグを立てて二重処理を防止
            isProcessedRef.current = true;

            // 2. 音を鳴らす
            SoundService.playSuccess();

            // 3. 画面更新 (即座にチェックマークにする)
            setOrder(prev => ({ ...prev, status: 'redeemed' }));

            // 4. アプリ全体のキャッシュを更新 (履歴画面に戻ったときのため)
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });

            // 5. ユーザーへの通知
            Alert.alert('受取完了', 'グッズのお渡しが完了しました！');
          }
        },
        error => {
          console.error('Firestore監視エラー:', error);
        },
      );

    return () => unsubscribe();
    // ★ 依存配列には order.status を入れないことでループを防ぐ
  }, [
    initialOrder.qr_code_id,
    initialOrder.delivery_method,
    initialOrder.status,
    queryClient,
  ]);

  // --- 以下、表示ロジック ---
  const orderDate = new Date(order.created_at).toLocaleString('ja-JP');

  const paymentMethodText =
    order.payment_method === 'stripe' ? 'クレジットカード' : '会場での現金払い';

  const deliveryMethodText =
    order.delivery_method === 'mail' ? '郵送' : '会場受取り';

  let statusText = '処理中';
  let statusStyle = styles.value_pending;

  if (order.status === 'pending') {
    statusText =
      order.payment_method === 'cash' ? '支払・受取待ち' : '支払処理中';
    statusStyle = styles.value_pending;
  } else if (order.status === 'paid' || order.status === 'shipped') {
    statusText = '支払い完了';
    statusStyle = styles.value_paid;
  } else if (order.status === 'redeemed') {
    statusText = '受取済み';
    statusStyle = styles.value_redeemed;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 会場受取りQRコード */}
        {order.delivery_method === 'venue' && order.qr_code_id && (
          <View style={styles.qrSection}>
            <Text style={styles.groupTitle}>会場受取り用 QRコード</Text>

            <View style={styles.qrContainer}>
              {order.status === 'redeemed' ? (
                <View style={styles.redeemedContainer}>
                  <Text style={styles.checkIcon}>✅</Text>
                  <Text style={styles.redeemedText}>受取済み</Text>
                </View>
              ) : (
                <QRCode
                  value={order.qr_code_id}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              )}
            </View>

            <Text style={styles.infoText}>
              {order.status === 'redeemed'
                ? 'この注文は受け取り済みです。'
                : 'このQRコードを会場のスタッフに提示してください。'}
            </Text>
          </View>
        )}

        {/* 配送先住所 */}
        {order.delivery_method === 'mail' && order.shipping_address && (
          <View style={styles.infoSection}>
            <Text style={styles.groupTitle}>配送先住所</Text>
            <View style={styles.infoBox}>
              <Text style={styles.addressText}>
                〒{order.shipping_address.postal_code}
              </Text>
              <Text style={styles.addressText}>
                {order.shipping_address.prefecture}{' '}
                {order.shipping_address.city}
              </Text>
              <Text style={styles.addressText}>
                {order.shipping_address.address_line1}
              </Text>
              {order.shipping_address.address_line2 && (
                <Text style={styles.addressText}>
                  {order.shipping_address.address_line2}
                </Text>
              )}
              <Text style={styles.infoText_small}>
                ( {order.shipping_address.name || ''} 様 )
              </Text>
            </View>
          </View>
        )}

        {/* 注文情報 */}
        <View style={styles.infoSection}>
          <Text style={styles.groupTitle}>ご注文情報</Text>
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={styles.label}>注文日時:</Text>
              <Text style={styles.value}>{orderDate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>注文ID:</Text>
              <Text style={styles.value}>#{order.id}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ステータス:</Text>
              <Text style={[styles.value, statusStyle]}>{statusText}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>お支払い方法:</Text>
              <Text style={styles.value}>{paymentMethodText}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>お受取り方法:</Text>
              <Text style={styles.value}>{deliveryMethodText}</Text>
            </View>
          </View>
        </View>

        {/* 注文明細 */}
        <View style={styles.infoSection}>
          <Text style={styles.groupTitle}>注文明細</Text>
          <View style={styles.infoBox}>
            {order.items.map((item: OrderItem) => (
              <View style={styles.itemRow} key={item.id}>
                <Text style={styles.itemName}>
                  {item.product_name} (x {item.quantity})
                </Text>
                <Text style={styles.itemPrice}>
                  ¥{(item.price_at_purchase * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>合計金額</Text>
              <Text style={styles.totalPrice}>
                ¥{order.total_price.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 40 },
  qrSection: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  qrContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 200,
  },
  redeemedContainer: { alignItems: 'center', justifyContent: 'center' },
  checkIcon: { fontSize: 50, color: '#FFF' }, // 視認性のため白に変更（お好みで黒でもOK）
  redeemedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
    marginTop: 10,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  infoBox: { backgroundColor: '#333333', borderRadius: 8, padding: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: { color: '#AAA', fontSize: 16, flexShrink: 0, width: 110 },
  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  value_pending: { color: '#0A84FF', fontSize: 16, fontWeight: 'bold' },
  value_paid: { color: '#34C759', fontSize: 16, fontWeight: 'bold' },
  value_redeemed: { color: '#888', fontSize: 16, fontWeight: 'bold' },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
  infoText_small: { color: '#AAA', fontSize: 14, marginTop: 10 },
  addressText: { color: '#FFFFFF', fontSize: 16, lineHeight: 24 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  itemName: { color: '#FFFFFF', fontSize: 16, flex: 1 },
  itemPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 10,
  },
  totalLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  totalPrice: { color: '#4CAF50', fontSize: 20, fontWeight: 'bold' },
});

export default OrderDetailScreen;
