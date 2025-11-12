import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image } from 'react-native'; // 1. ★ Image をインポート
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// 2. ★ react-native-vector-icons から Icon をインポート
// import Icon from 'react-native-vector-icons/MaterialIcons';

// スクリーンとスタックをインポート
import ProductStackNavigator from './ProductStackNavigator';
import EventStackNavigator from './EventStackNavigator';
import TimelineScreen from '../screens/TimelineScreen';
import MyPageStackNavigator from './MyPageStackNavigator';
import SearchStackNavigator from './SearchStackNavigator';

// (Props, Tab の定義は変更なし)
interface Props {
  onLogout: () => void;
}
const Tab = createBottomTabNavigator();

const MainTabNavigator: React.FC<Props> = ({ onLogout }) => {
  // 3. ★ screenOptions を関数形式に変更
  const screenOptions = ({ route }: { route: any }) => ({
    tabBarStyle: {
      backgroundColor: '#1C1C1E',
      borderTopColor: '#333',
    },
    tabBarActiveTintColor: '#0A84FF', // アクティブなアイコンの色
    tabBarInactiveTintColor: '#888', // 非アクティブなアイコンの色
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

    // 4. ★ tabBarIcon の設定を追加
    tabBarIcon: ({
      focused,
      color,
      size,
    }: {
      focused: boolean;
      color: string;
      size: number;
    }) => {
      if (route.name === 'EventsStack') {
        return (
          <Image
            source={require('../assets/images/event_icon.png')}
            style={{
              width: size,
              height: size,
            }}
          />
        );
      } else if (route.name === 'ProductsStack') {
        // ★ グッズアイコンをカスタム画像に変更
        return (
          <Image
            source={require('../assets/images/goods_icon.png')}
            style={{
              width: size,
              height: size,
            }}
          />
        );
      } else if (route.name === 'Timeline') {
        // ★ タイムラインアイコンをカスタム画像に変更
        return (
          <Image
            source={require('../assets/images/timeline_icon.png')}
            style={{
              width: size,
              height: size,
            }}
          />
        );
      } else if (route.name === 'Search') {
        return (
          <Image
            source={require('../assets/images/search_icon.png')}
            style={{
              width: size,
              height: size,
            }}
          />
        );
      } else if (route.name === 'MyPageStack') {
        // ★ マイページアイコンをカスタム画像に変更
        return (
          <Image
            source={require('../assets/images/mypage_icon.png')}
            style={{
              width: size,
              height: size,
            }}
          />
        );
      }

      return (
        <Image
          source={require('../assets/images/default_icon.png')}
          style={{ width: size, height: size }}
        />
      );
    },
  });

  return (
    // 6. ★ screenOptions を更新
    <Tab.Navigator screenOptions={screenOptions}>
      {/* 1. イベント一覧タブ */}
      <Tab.Screen
        name="EventsStack"
        options={{
          title: 'イベント', // 7. ★ 名前をアイコンに合わせて短縮
          headerShown: false,
        }}
      >
        {() => <EventStackNavigator onLogout={onLogout} />}
      </Tab.Screen>

      {/* 2. グッズ一覧タブ */}
      <Tab.Screen
        name="ProductsStack"
        options={{
          title: 'グッズ',
          headerShown: false,
        }}
      >
        {() => <ProductStackNavigator onLogout={onLogout} />}
      </Tab.Screen>

      {/* 3. タイムラインタブ */}
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          title: 'お知らせ',
        }}
      />

      <Tab.Screen
        name="Search"
        // component={ArtistListScreen} // 3. ★ 削除
        options={{
          title: '探す',
          headerShown: false, // 4. ★ ヘッダーはスタック側で管理
        }}
      >
        {/* 5. ★ SearchStackNavigator を呼び出す */}
        {() => <SearchStackNavigator onLogout={onLogout} />}
      </Tab.Screen>

      {/* 4. マイページタブ */}
      <Tab.Screen
        name="MyPageStack"
        options={{
          title: 'マイページ',
          headerShown: false,
        }}
      >
        {() => <MyPageStackNavigator authToken="" onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

// (styles は変更なし)
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
