import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

// 必要なスクリーンをインポート
import MyPageScreen from '../screens/MyPageScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import EventCreateScreen from '../screens/EventCreateScreen';
import ProductCreateScreen from '../screens/ProductCreateScreen';
import PostCreateScreen from '../screens/PostCreateScreen';
import ScannerScreen from '../screens/ScannerScreen';
import GateScannerScreen from '../screens/GateScannerScreen';
import InquiryScreen from '../screens/InquiryScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
// 1. ★ OrderDetailScreen と Order 型をインポート
import OrderDetailScreen, { Order } from '../screens/OrderDetailScreen';
import FavoriteProductsScreen from '../screens/FavoriteProductsScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';

// 2. ★ 型定義を修正
export type MyPageStackParamList = {
  MyPageTop: undefined;
  ProfileEdit: undefined;
  MyTickets: undefined;
  EventCreate: undefined;
  ProductCreate: undefined;
  PostCreate: undefined;
  Scan: { scanMode: 'ticket' | 'order' };
  GateScanner: undefined;
  Inquiry: undefined;
  OrderHistory: undefined;
  // ↓↓↓ ここを orderId (数値) から order (オブジェクト) に変更
  OrderDetail: { order: Order };
  FavoriteProducts: undefined;
  ProductDetail: { productId: number };
};

// 3. ★ Props (変更なし)
interface Props {
  onLogout: () => void;
}

const Stack = createStackNavigator<MyPageStackParamList>();

// [・・・(LogoutButton は変更なし)・・・]
const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
    <Text style={styles.logoutButtonText}>ログアウト</Text>
  </TouchableOpacity>
);

const MyPageStackNavigator: React.FC<Props> = ({ onLogout }) => {
  // [・・・(screenOptions は変更なし)・・・]
  const screenOptions = {
    headerStyle: {
      backgroundColor: '#1C1C1E',
      shadowColor: '#000',
    },
    headerTitleStyle: {
      color: '#FFFFFF',
    },
    headerTintColor: '#0A84FF',
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* [・・・(MyPageTop, ProfileEdit, MyTickets, ... Inquiry までは変更なし)・・・] */}
      <Stack.Screen name="MyPageTop" options={{ headerShown: false }}>
        {() => <MyPageScreen onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: 'プロフィール編集' }}
      />
      <Stack.Screen name="MyTickets" options={{ title: 'マイチケット' }}>
        {() => <MyTicketsScreen />}
      </Stack.Screen>
      <Stack.Screen name="EventCreate" options={{ title: 'イベント作成' }}>
        {() => <EventCreateScreen />}
      </Stack.Screen>
      <Stack.Screen name="ProductCreate" options={{ title: 'グッズ作成' }}>
        {() => <ProductCreateScreen />}
      </Stack.Screen>
      <Stack.Screen name="PostCreate" options={{ title: '投稿作成' }}>
        {() => <PostCreateScreen />}
      </Stack.Screen>
      <Stack.Screen
        name="Scan"
        component={ScannerScreen}
        options={{ title: 'QRスキャン' }}
      />
      <Stack.Screen
        name="GateScanner"
        component={GateScannerScreen}
        options={{ title: '自動入場ゲート', headerShown: false }}
      />
      <Stack.Screen
        name="Inquiry"
        component={InquiryScreen}
        options={{ title: 'お問い合わせ' }}
      />

      {/* 10. ★ OrderHistory (変更なし) */}
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: 'グッズ購入履歴' }}
      />

      {/* 4. ★ OrderDetail のコメントを解除し、コンポーネントを登録 */}
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: '注文詳細' }}
      />

      <Stack.Screen
        name="FavoriteProducts"
        component={FavoriteProductsScreen}
        options={{ title: 'お気に入りグッズ' }}
      />

      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'グッズ詳細' }}
      />
    </Stack.Navigator>
  );
};

// [・・・(styles は変更なし)・・・]
const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 15,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});

export default MyPageStackNavigator;
