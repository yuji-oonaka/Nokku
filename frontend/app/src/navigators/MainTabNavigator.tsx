import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// スクリーンとスタックをインポート
import ProductStackNavigator from './ProductStackNavigator';
import EventStackNavigator from './EventStackNavigator';
import TimelineScreen from '../screens/TimelineScreen';
import MyPageStackNavigator from './MyPageStackNavigator'; // マイページスタック

// App.tsx から渡される Props を定義
interface Props {
  authToken: string;
  onLogout: () => void; // ログアウト処理の関数
}

// タブナビゲーターを作成
const Tab = createBottomTabNavigator();

const MainTabNavigator: React.FC<Props> = ({ authToken, onLogout }) => {
  // ダークモード用のタブスタイル設定
  const screenOptions = {
    tabBarStyle: {
      backgroundColor: '#1C1C1E',
      borderTopColor: '#333',
    },
    tabBarActiveTintColor: '#0A84FF',
    tabBarInactiveTintColor: '#888',
    headerStyle: {
      backgroundColor: '#1C1C1E',
    },
    headerTitleStyle: {
      color: '#FFFFFF',
    },
    // ★ヘッダー右側のログアウトボタン (共通設定)
    headerRight: () => (
      <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>ログアウト</Text>
      </TouchableOpacity>
    ),
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      {/* 1. イベント一覧タブ */}
      <Tab.Screen
        name="EventsStack" // 名前を "Events" -> "EventsStack" に変更（被り防止）
        options={{
          title: 'イベント',
          headerShown: false, // スタック側がヘッダーを持つため
        }}
      >
        {() => <EventStackNavigator authToken={authToken} />}
      </Tab.Screen>

      {/* 2. グッズ一覧タブ */}
      <Tab.Screen
        name="ProductsStack" // 名前を "Products" -> "ProductsStack" に変更
        options={{
          title: 'グッズ',
          headerShown: false, // スタック側がヘッダーを持つため
        }}
      >
        {() => <ProductStackNavigator authToken={authToken} />}
      </Tab.Screen>

      {/* 3. タイムラインタブ */}
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          title: 'タイムライン',
          // ログアウトボタンは screenOptions から自動で適用
        }}
      />

      {/* 4. マイページタブ (★新設) */}
      <Tab.Screen
        name="MyPageStack" // 名前を "MyPageStack" に設定
        options={{
          title: 'マイページ',
          headerShown: false, // MyPageStackNavigator がヘッダーを持つため
        }}
      >
        {/* authToken と onLogout をそのまま渡す */}
        {() => (
          <MyPageStackNavigator authToken={authToken} onLogout={onLogout} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
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

export default MainTabNavigator;
