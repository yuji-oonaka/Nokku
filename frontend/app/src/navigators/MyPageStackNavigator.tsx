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

// App.tsx / MainTabNavigator から渡される Props
interface Props {
  authToken: string;
  onLogout: () => void; // ログアウト処理の関数
}

const Stack = createStackNavigator();

// ログアウトボタン（ヘッダー右側用）
const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
    <Text style={styles.logoutButtonText}>ログアウト</Text>
  </TouchableOpacity>
);

const MyPageStackNavigator: React.FC<Props> = ({ authToken, onLogout }) => {
  // ダークモード用のヘッダースタイル
  const screenOptions = {
    headerStyle: {
      backgroundColor: '#1C1C1E',
      shadowColor: '#000', // iOS
    },
    headerTitleStyle: {
      color: '#FFFFFF',
    },
    headerTintColor: '#0A84FF', // 戻るボタンの色
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* 1. マイページ トップ */}
      <Stack.Screen
        name="MyPageTop"
        options={{
          title: 'マイページ',
          // この画面ではヘッダー右側にログアウトボタンを置かない
          // (MyPageScreen本体がログアウトボタンを持つため)
          headerShown: false, // MyPageScreenがSafeAreaViewを持つため不要
        }}
      >
        {/* MyPageScreen に onLogout 関数を渡す */}
        {() => <MyPageScreen onLogout={onLogout} />}
      </Stack.Screen>

      {/* 2. プロフィール編集 */}
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{
          title: 'プロフィール編集',
        }}
      />

      {/* 3. 購入済みチケット */}
      <Stack.Screen
        name="MyTickets"
        options={{
          title: 'マイチケット',
        }}
      >
        {() => <MyTicketsScreen authToken={authToken} />}
      </Stack.Screen>

      {/* --- アーティスト/管理者用 --- */}

      {/* 4. イベント作成 */}
      <Stack.Screen
        name="EventCreate"
        options={{
          title: 'イベント作成',
        }}
      >
        {() => <EventCreateScreen authToken={authToken} />}
      </Stack.Screen>

      {/* 5. グッズ作成 */}
      <Stack.Screen
        name="ProductCreate"
        options={{
          title: 'グッズ作成',
        }}
      >
        {() => <ProductCreateScreen authToken={authToken} />}
      </Stack.Screen>

      {/* 6. 投稿作成 */}
      <Stack.Screen
        name="PostCreate"
        options={{
          title: '投稿作成',
        }}
      >
        {/* 👈 Render prop に変更 */}
        {() => <PostCreateScreen />}
      </Stack.Screen>

      {/* 7. QRスキャン */}
      <Stack.Screen
        name="Scan"
        component={ScannerScreen}
        options={{
          title: 'QRスキャン',
        }}
      />

      {/* ↓↓↓ 3. 自動入場ゲート画面 */}
      <Stack.Screen
        name="GateScanner"
        component={GateScannerScreen}
        options={{
          title: '自動入場ゲート',
          headerShown: false, // 4. ★ 全画面UIのためヘッダーを非表示
        }}
      />

      {/* ↓↓↓ 2. お問い合わせ画面 ↓↓↓ */}
      <Stack.Screen
        name="Inquiry"
        component={InquiryScreen}
        options={{
          title: 'お問い合わせ',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 15,
  },
  logoutButtonText: {
    color: '#FF3B30', // 赤色
    fontSize: 16,
  },
});

export default MyPageStackNavigator;
