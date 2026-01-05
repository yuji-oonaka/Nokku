import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';




import { Post } from '../api/queries';
import TimelineScreen from '../features/social/TimelineScreen';
import PostEditScreen from '../features/social/PostEditScreen';
import PostDetailScreen from '../features/social/PostDetailScreen';

// 3. ★ 型定義 (このスタックが持つ画面)
export type TimelineStackParamList = {
  TimelineList: undefined;
  PostEdit: { post: Post };
  PostDetail: { post: Post }; // 👈 ★ 追加
};

// 4. ★ Props (MainTabNavigatorから渡される)
interface Props {
  onLogout: () => void;
}

const Stack = createStackNavigator<TimelineStackParamList>();

// ログアウトボタン（ヘッダー右側用）
const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
    <Text style={styles.logoutButtonText}>ログアウト</Text>
  </TouchableOpacity>
);

const TimelineStackNavigator: React.FC<Props> = ({ onLogout }) => {
  // ダークモード用のヘッダースタイル
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
      {/* 1. お知らせ一覧 (Timeline) */}
      <Stack.Screen
        name="TimelineList"
        component={TimelineScreen}
        options={{
          title: 'お知らせ',
          // この画面にもログアウトボタンを表示
          headerRight: () => <LogoutButton onLogout={onLogout} />,
        }}
      />

      {/* 6. ★ 投稿編集  */}
      <Stack.Screen
        name="PostEdit"
        component={PostEditScreen}
        options={{ title: '投稿を編集' }}
      />
      {/* 3. ★ (NEW) 投稿詳細画面を登録 */}
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ title: 'お知らせ詳細' }}
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

export default TimelineStackNavigator;
