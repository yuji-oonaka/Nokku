import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // ★ Stack追加

// スクリーンとスタックをインポート
import ProductStackNavigator from './ProductStackNavigator';
import EventStackNavigator from './EventStackNavigator';
import TimelineStackNavigator from './TimelineStackNavigator';
import MyPageStackNavigator from './MyPageStackNavigator'; // ここには通常MyPageScreenが含まれる
import SearchStackNavigator from './SearchStackNavigator';

// Staff用画面
import GateScannerScreen from '../features/tickets/GateScannerScreen';
import ScannerScreen from '../features/tickets/ScannerScreen'; // 手動スキャン用
import MyPageScreen from '../features/auth/MyPageScreen'; // ★ 改修したMyPageをインポート
import ProfileEditScreen from '../features/auth/ProfileEditScreen'; // 必要なら

import { useAuth } from '../context/AuthContext';

interface Props {
  onLogout: () => void;
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ★ 追加: Staff専用スタックナビゲーター
// これにより、Staffは「メニュー」⇔「スキャナー」を行き来できます
const StaffStackNavigator = ({ onLogout }: { onLogout: () => void }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1C1C1E' },
        headerTitleStyle: { color: '#FFFFFF' },
        headerTintColor: '#0A84FF',
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="StaffDashboard"
        options={{
          title: 'スタッフメニュー',
          // ログアウトボタンをここに配置
          headerRight: () => (
            <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          ),
        }}
      >
        {/* propsでonLogoutを渡す */}
        {() => <MyPageScreen onLogout={onLogout} />}
      </Stack.Screen>

      <Stack.Screen
        name="GateScanner"
        component={GateScannerScreen}
        options={{ title: '自動ゲート' }}
      />
      <Stack.Screen
        name="Scan"
        component={ScannerScreen}
        options={{ title: 'QRスキャン' }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: 'プロフィール編集' }}
      />
    </Stack.Navigator>
  );
};

const MainTabNavigator: React.FC<Props> = ({ onLogout }) => {
  const { user } = useAuth();

  const screenOptions = ({ route }: { route: any }) => ({
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
    // Staff以外は共通ヘッダーログアウト
    headerRight: () =>
      user?.role !== 'staff' ? (
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>ログアウト</Text>
        </TouchableOpacity>
      ) : null,
    tabBarIcon: ({
      focused,
      color,
      size,
    }: {
      focused: boolean;
      color: string;
      size: number;
    }) => {
      // アイコン設定 (既存コード維持)
      if (route.name === 'EventsStack') {
        return (
          <Image
            source={require('../assets/images/event_icon.png')}
            style={{ width: size, height: size }}
          />
        );
      } else if (route.name === 'ProductsStack') {
        return (
          <Image
            source={require('../assets/images/goods_icon.png')}
            style={{ width: size, height: size }}
          />
        );
      } else if (route.name === 'Timeline') {
        return (
          <Image
            source={require('../assets/images/timeline_icon.png')}
            style={{ width: size, height: size }}
          />
        );
      } else if (route.name === 'Search') {
        return (
          <Image
            source={require('../assets/images/search_icon.png')}
            style={{ width: size, height: size }}
          />
        );
      } else if (route.name === 'MyPageStack') {
        return (
          <Image
            source={require('../assets/images/mypage_icon.png')}
            style={{ width: size, height: size }}
          />
        );
      }
      // Staff用アイコン
      else if (route.name === 'StaffMenu') {
        return (
          <Image
            source={require('../assets/images/mypage_icon.png')}
            style={{ width: size, height: size }}
          />
        );
      }

      return (
        <Image
          source={require('../assets/images/default_icon.jpg')}
          style={{ width: size, height: size }}
        />
      );
    },
  });

  // --------------------------------------------------------------------------
  // Staffロール分離ロジック (Dashboard方式)
  // --------------------------------------------------------------------------
  if (user?.role === 'staff') {
    return (
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="StaffMenu"
          options={{
            title: 'スタッフ業務',
            headerShown: false, // Stack側でヘッダーを制御するため
          }}
        >
          {() => <StaffStackNavigator onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  // --- 通常ユーザー・アーティスト・Admin用の表示 (既存コード) ---
  return (
    <Tab.Navigator
      screenOptions={screenOptions}
      screenListeners={({ navigation, route }) => ({
        tabPress: e => {
          const routeAny = route as any;
          if (
            navigation.isFocused() &&
            routeAny.state &&
            routeAny.state.index > 0
          ) {
            e.preventDefault();
            const rootRouteName = routeAny.state.routes[0].name;
            navigation.navigate(route.name, { screen: rootRouteName });
          }
        },
      })}
    >
      {/* 1. イベント一覧 */}
      <Tab.Screen
        name="EventsStack"
        options={{ title: 'イベント', headerShown: false }}
      >
        {() => <EventStackNavigator onLogout={onLogout} />}
      </Tab.Screen>

      {/* 2. グッズ一覧 */}
      <Tab.Screen
        name="ProductsStack"
        options={{ title: 'グッズ', headerShown: false }}
      >
        {() => <ProductStackNavigator onLogout={onLogout} />}
      </Tab.Screen>

      {/* 3. タイムライン */}
      <Tab.Screen
        name="Timeline"
        options={{ title: 'お知らせ', headerShown: false }}
      >
        {() => <TimelineStackNavigator onLogout={onLogout} />}
      </Tab.Screen>

      {/* 4. 検索 */}
      <Tab.Screen name="Search" options={{ title: '探す', headerShown: false }}>
        {() => <SearchStackNavigator onLogout={onLogout} />}
      </Tab.Screen>

      {/* 5. マイページ */}
      <Tab.Screen
        name="MyPageStack"
        options={{ title: 'マイページ', headerShown: false }}
      >
        {() => <MyPageStackNavigator onLogout={onLogout} />}
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
