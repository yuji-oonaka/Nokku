import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// スクリーンをインポート
import EventListScreen from '../screens/EventListScreen';
import ProductListScreen from '../screens/ProductListScreen';
import EventCreateScreen from '../screens/EventCreateScreen';
import ProductCreateScreen from '../screens/ProductCreateScreen';

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

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      {/* 1. イベント一覧タブ */}
      <Tab.Screen name="Events" options={{ title: 'イベント一覧' }}>
        {/*
          EventListScreen に authToken を渡すため、
          component={} ではなく、children を使ってコンポーネントをレンダリングします
        */}
        {() => <EventListScreen authToken={authToken} />}
      </Tab.Screen>

      {/* 2. グッズ一覧タブ */}
      <Tab.Screen name="Products" options={{ title: 'グッズ一覧' }}>
        {() => <ProductListScreen authToken={authToken} />}
      </Tab.Screen>

      {/* 3. イベント作成タブ */}
      <Tab.Screen name="CreateEvent" options={{ title: 'イベント作成' }}>
        {() => <EventCreateScreen authToken={authToken} />}
      </Tab.Screen>

      {/* 4. グッズ作成タブ */}
      <Tab.Screen name="CreateProduct" options={{ title: 'グッズ作成' }}>
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
