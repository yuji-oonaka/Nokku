import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

// 必要なスクリーンをインポート
import ProfileEditScreen from '../features/auth/ProfileEditScreen';
import { Order, UserTicket } from '../api/queries';
import MyPageScreen from '../features/auth/MyPageScreen';
import MyTicketsScreen from '../features/tickets/MyTicketsScreen';
import EventCreateScreen from '../features/events/EventCreateScreen';
import ProductCreateScreen from '../features/commerce/ProductCreateScreen';
import PostCreateScreen from '../features/social/PostCreateScreen';
import ScannerScreen from '../features/tickets/ScannerScreen';
import GateScannerScreen from '../features/tickets/GateScannerScreen';

// 🗑️ 削除: 旧 InquiryScreen
// import InquiryScreen from '../features/auth/InquiryScreen';

// 🆕 追加: 新しい問い合わせ機能
import InquiryListScreen from '../features/inquiry/InquiryListScreen';
import InquiryDetailScreen from '../features/inquiry/InquiryDetailScreen';
import InquiryCreateScreen from '../features/inquiry/InquiryCreateScreen';

import OrderHistoryScreen from '../features/commerce/OrderHistoryScreen';
import FavoriteProductsScreen from '../features/commerce/FavoriteProductsScreen';
import OrderDetailScreen from '../features/commerce/OrderDetailScreen';
import ProductDetailScreen from '../features/commerce/ProductDetailScreen';
import TicketDetailScreen from '../features/tickets/TicketDetailScreen';
import SubscriptionScreen from '../features/subscription/SubscriptionScreen';

export type MyPageStackParamList = {
  MyPageTop: undefined;
  ProfileEdit: undefined;
  MyTickets: undefined;
  EventCreate: undefined;
  ProductCreate: undefined;
  PostCreate: undefined;
  Scan: { scanMode: 'ticket' | 'order' };
  GateScanner: undefined;
  Subscription: undefined;

  // 🗑️ 削除
  // Inquiry: undefined;

  // 🆕 追加
  InquiryList: undefined;
  InquiryDetail: { inquiryId: number };
  InquiryCreate: {
    target_type?: 'event' | 'user' | 'app' | 'order';
    target_id?: number;
    target_name?: string;
    default_subject?: string; // ★追加: 件名の初期値
  };

  OrderHistory: undefined;
  OrderDetail: { order: Order };
  FavoriteProducts: undefined;
  ProductDetail: { productId: number };
  TicketDetail: { ticket: UserTicket };
};

interface Props {
  onLogout: () => void;
}

const Stack = createStackNavigator<MyPageStackParamList>();

const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
    <Text style={styles.logoutButtonText}>ログアウト</Text>
  </TouchableOpacity>
);

const MyPageStackNavigator: React.FC<Props> = ({ onLogout }) => {
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
      <Stack.Screen name="MyPageTop" options={{ headerShown: false }}>
        {() => <MyPageScreen onLogout={onLogout} />}
      </Stack.Screen>

      {/* ... (中略: ProfileEdit, MyTickets, EventCreate など変更なし) ... */}
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

      {/* 🆕 問い合わせ関連スクリーン */}
      <Stack.Screen
        name="InquiryList"
        component={InquiryListScreen}
        options={{ title: 'お問い合わせ履歴' }}
      />
      <Stack.Screen
        name="InquiryDetail"
        component={InquiryDetailScreen}
        options={{ title: 'お問い合わせ詳細' }}
      />
      <Stack.Screen
        name="InquiryCreate"
        component={InquiryCreateScreen}
        options={{ title: 'お問い合わせ作成' }}
      />

      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: 'グッズ購入履歴' }}
      />
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
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{ title: 'チケット詳細' }}
      />
      {/* ★ 追加: ここにプラン契約画面を登録 */}
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'プラン契約' }}
      />
    </Stack.Navigator>
  );
};

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
