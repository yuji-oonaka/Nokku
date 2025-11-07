import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// スクリーンをインポート
import EventCreateScreen from '../screens/EventCreateScreen';
import ProductCreateScreen from '../screens/ProductCreateScreen';
import ProductStackNavigator from './ProductStackNavigator';
import EventStackNavigator from './EventStackNavigator';

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
    headerRight: () => (
      <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>ログアウト</Text>
      </TouchableOpacity>
    ),
  };

  const LogoutButton = () => (
    <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
      <Text style={styles.logoutButtonText}>ログアウト</Text>
    </TouchableOpacity>
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      {/* 1. イベント一覧タブ */}
      <Tab.Screen
        name="Events"
        options={{
          title: 'イベント一覧',
          headerShown: false,
        }}
      >
        {() => <EventStackNavigator authToken={authToken} />}
      </Tab.Screen>

      {/* 2. グッズ一覧タブ */}
      <Tab.Screen
        name="Products"
        options={{
          title: 'グッズ',
          headerShown: false, // 👈 スタック側がヘッダーを持つため、タブのヘッダーは非表示
        }}
      >
        {/* 👈 3. ProductListScreen から ProductStackNavigator に差し替え */}
        {() => <ProductStackNavigator authToken={authToken} />}
      </Tab.Screen>

      {/* 3. イベント作成タブ */}
      <Tab.Screen
        name="CreateEvent"
        options={{
          title: 'イベント作成',
          headerRight: LogoutButton, // 👈 ログアウトボタンを個別に追加
        }}
      >
        {() => <EventCreateScreen authToken={authToken} />}
      </Tab.Screen>

      {/* 4. グッズ作成タブ */}
      <Tab.Screen
        name="CreateProduct"
        options={{
          title: 'グッズ作成',
          headerRight: LogoutButton, // 👈 ログアウトボタンを個別に追加
        }}
      >
        {() => <ProductCreateScreen authToken={authToken} />}
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
