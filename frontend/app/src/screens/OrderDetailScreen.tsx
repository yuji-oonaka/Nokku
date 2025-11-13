import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg'; // 1. ★ QRコードライブラリ
import { MyPageStackParamList } from '../navigators/MyPageStackNavigator'; // 2. ★ 型をインポート

// --- 3. ★ 型定義 (OrderHistoryScreen とほぼ同じ) ---
// (APIから返ってくる Order の型)
// ※ OrderHistoryScreen から Order オブジェクト丸ごとを受け取ることもできますが、
//   最新の情報を表示するために、APIを「再取得」する設計も一般的です。
//   今回はシンプルに「OrderHistoryScreen から渡されたデータ」を
//   表示する前提で進めますが、QRコードIDが渡されないと問題です。

// RoutePropが orderId を受け取る型
type OrderDetailRouteProp = RouteProp<MyPageStackParamList, 'OrderDetail'>;

// (Order と OrderItem の型定義を OrderHistoryScreen からコピー)
export interface OrderItem {
  id: number;
  quantity: number;
  price_at_purchase: number;
  product_name: string;
}
export interface Order {
  id: number;
  total_price: number;
  status: 'pending' | 'paid' | 'shipped' | 'redeemed';
  payment_method: 'stripe' | 'cash';
  delivery_method: 'mail' | 'venue';
  shipping_address: any | null;
  created_at: string;
  items: OrderItem[];
  qr_code_id: string | null;
}

const OrderDetailScreen: React.FC = () => {
  const route = useRoute<OrderDetailRouteProp>();
  // 4. ★ route.params から 'order' オブジェクトを丸ごと受け取る
  // (OrderHistoryScreen からの遷移時に order を渡すよう、後で修正します)
  const { order } = route.params;

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>注文情報の読み込みに失敗しました。</Text>
      </SafeAreaView>
    );
  }

  // --- 5. ★ 描画用のヘルパー ---
  const orderDate = new Date(order.created_at).toLocaleString('ja-JP');

  // 支払い方法の表示名
  const paymentMethodText =
    order.payment_method === 'stripe' ? 'クレジットカード' : '会場での現金払い';

  // 受け取り方法の表示名
  const deliveryMethodText =
    order.delivery_method === 'mail' ? '郵送' : '会場受取り';

  let statusText = '処理中';
  let statusStyle = styles.value_pending; // デフォルトスタイル

  if (order.status === 'pending') {
    if (order.payment_method === 'cash') {
      statusText = '支払・受取待ち';
    } else {
      statusText = '支払処理中';
    }
    statusStyle = styles.value_pending; // (青)
  } else if (order.status === 'paid' || order.status === 'shipped') {
    statusText = '支払い完了';
    statusStyle = styles.value_paid; // (緑)
  } else if (order.status === 'redeemed') {
    statusText = '受取済み';
    statusStyle = styles.value_redeemed; // (グレー)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 6. ★ (メイン) 会場受取りQRコード */}
        {order.delivery_method === 'venue' && order.qr_code_id && (
          <View style={styles.qrSection}>
            <Text style={styles.groupTitle}>会場受取り用 QRコード</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={order.qr_code_id} // ★ バックエンドで生成したUUID
                size={200}
                backgroundColor="white"
                color="black"
              />
            </View>
            <Text style={styles.infoText}>
              このQRコードを会場のスタッフに提示してください。
            </Text>
            {/* (ここに 'is_used' (redeemed) 判定も追加可能) */}
          </View>
        )}

        {/* 7. ★ (メイン) 配送先住所 */}
        {order.delivery_method === 'mail' && order.shipping_address && (
          <View style={styles.infoSection}>
            <Text style={styles.groupTitle}>配送先住所</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                〒{order.shipping_address.postal_code}
              </Text>
              <Text style={styles.infoText}>
                {order.shipping_address.prefecture}{' '}
                {order.shipping_address.city}
              </Text>
              <Text style={styles.infoText}>
                {order.shipping_address.address_line1}
              </Text>
              {order.shipping_address.address_line2 && (
                <Text style={styles.infoText}>
                  {order.shipping_address.address_line2}
                </Text>
              )}
              <Text style={styles.infoText_small}>
                ( {order.shipping_address.name} 様 )
              </Text>
            </View>
          </View>
        )}

        {/* 8. ★ 注文情報サマリー */}
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
              <Text style={styles.value_status}>{statusText}</Text>
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

        {/* 9. ★ 注文明細 */}
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
            {/* 合計 */}
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

// --- 10. ★ スタイル (ダークモード前提) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
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
  infoBox: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: '#AAA',
    fontSize: 16,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  value_status: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  value_pending: {
    color: '#0A84FF', // 青
    fontSize: 16,
    fontWeight: 'bold',
  },
  value_paid: {
    color: '#34C759', // 緑
    fontSize: 16,
    fontWeight: 'bold',
  },
  value_redeemed: {
    color: '#888', // グレー
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  infoText_small: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 10,
  },
  // --- 明細 ---
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1, // 11. ★ 長い商品名で折り返す用
  },
  itemPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  // --- 合計 ---
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 10,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalPrice: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default OrderDetailScreen;
