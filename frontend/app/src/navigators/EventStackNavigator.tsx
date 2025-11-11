import React from 'react';
// ↓↓↓ 1. ★ 'native-stack' から 'stack' に修正 (インストールしたものを使う)
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native'; // ログアウトボタン用

// スクリーンをインポート
import EventListScreen from '../screens/EventListScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import TicketTypeCreateScreen from '../screens/TicketTypeCreateScreen';
import EventEditScreen from '../screens/EventEditScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatLobbyScreen from '../screens/ChatLobbyScreen';

// 2. ★ EventStackParamList の型定義を修正
export type EventStackParamList = {
  EventList: undefined;
  // 'event' オブジェクトではなく 'eventId' (数値) を渡すように修正
  EventDetail: { eventId: number };
  TicketTypeCreate: { event_id: number };
  // 3. ★ EventEdit を追加
  EventEdit: { eventId: number };
  ChatLobby: { eventId: number; eventTitle: string };
  Chat: {
    eventId: number;
    eventTitle: string;
    threadId: string;
    threadTitle: string;
  };
};

// スタックナビゲーターを作成
const Stack = createStackNavigator<EventStackParamList>();

// MainTabNavigatorから渡されるProps
interface Props {
  // 4. ★ authToken は不要になったので削除
  // authToken: string;
  onLogout: () => void; // ログアウト処理の関数
}

// 5. ★ LogoutButton をここで定義 (MainTabNavigator と共通化)
const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
    <Text style={styles.logoutButtonText}>ログアウト</Text>
  </TouchableOpacity>
);

// 6. ★ Props から authToken を削除
const EventStackNavigator: React.FC<Props> = ({ onLogout }) => {
  // ダークモード用のヘッダースタイル
  const screenOptions = {
    headerStyle: {
      backgroundColor: '#1C1C1E',
    },
    headerTitleStyle: {
      color: '#FFFFFF',
    },
    headerTintColor: '#0A84FF',
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* 1. 一番下の画面 (イベント一覧) */}
      <Stack.Screen
        name="EventList"
        // 7. ★ 'component' prop を使うように修正
        component={EventListScreen}
        options={{
          title: 'イベント一覧', // 8. ★ headerShown:false を削除し、タイトルとボタンを設定
          headerRight: () => <LogoutButton onLogout={onLogout} />,
        }}
        // 9. ★レンダープロップ {() => ...} を削除
      />

      {/* 2. 積み重なる画面 (イベント詳細) */}
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen} // 10. ★ 'component' prop を使う
        options={{ title: 'イベント詳細' }}
        // 11. ★レンダープロップ {() => ...} を削除
      />

      {/* 3. 券種作成画面 */}
      <Stack.Screen
        name="TicketTypeCreate"
        component={TicketTypeCreateScreen} // 12. ★ 'component' prop を使う
        options={{ title: '券種を作成' }}
        // 13. ★レンダープロップ {() => ...} を削除
      />

      {/* 4. イベント編集画面 (ここは元からOK) */}
      <Stack.Screen
        name="EventEdit"
        component={EventEditScreen}
        options={{ title: 'イベント編集' }}
      />

      {/* ↓↓↓ 1. ChatLobbyScreen を追加 (EventDetail からここへ遷移する) ↓↓↓ */}
      <Stack.Screen
        name="ChatLobby"
        component={ChatLobbyScreen}
        options={({ route }) => ({
          title: `${route.params.eventTitle} ロビー`,
        })}
      />
      {/* 2. ChatScreen は ChatLobby から遷移するようにする */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: `${route.params.threadTitle}`, // ヘッダーはスレッド名を表示
        })}
      />
    </Stack.Navigator>
  );
};

// 14. ★ styles を追加
const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 15,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});

export default EventStackNavigator;
