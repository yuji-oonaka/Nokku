// C:\Nokku\frontend\app\src\navigation\SearchStackNavigator.tsx (仮のパス)

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

// 画面コンポーネントをインポート
import ArtistListScreen from '../screens/ArtistListScreen';
import ArtistProfileScreen from '../screens/ArtistProfileScreen';

// 1. ナビゲーターが受け取るPropsの型
interface Props {
  onLogout: () => void;
}

// 2. スタックの型定義 (仮)
// (AppNavigator.tsx などで定義済みの型をインポートするのが望ましい)
export type SearchStackParamList = {
  ArtistList: undefined; // パラメータなし
  ArtistProfile: { artistId: number }; // artistId を受け取る
};

const Stack = createStackNavigator<SearchStackParamList>();

const SearchStackNavigator: React.FC<Props> = ({ onLogout }) => {
  return (
    <Stack.Navigator
      // 共通のヘッダースタイル
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1C1C1E',
        },
        headerTitleStyle: {
          color: '#FFFFFF',
        },
        headerTintColor: '#0A84FF', // 戻るボタンの色
      }}
    >
      {/* 3. アーティスト一覧画面 (探す) */}
      <Stack.Screen
        name="ArtistList"
        component={ArtistListScreen}
        options={{
          title: '探す',
          // MainTabNavigator から引き継いだログアウトボタン
          headerRight: () => (
            <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* 4. アーティスト詳細画面 (新規) */}
      <Stack.Screen
        name="ArtistProfile"
        component={ArtistProfileScreen}
        options={{
          title: '', // ヘッダータイトルは空 (画面内でアーティスト名を表示するため)
          headerBackTitle: '戻る', // iOS用
        }}
      />
    </Stack.Navigator>
  );
};

// MainTabNavigator から持ってきたスタイル
const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 15,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});

export default SearchStackNavigator;
