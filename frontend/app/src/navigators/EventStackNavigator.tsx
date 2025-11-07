import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// スクリーンをインポート
import EventListScreen from '../screens/EventListScreen';
import EventDetailScreen from '../screens/EventDetailScreen';

// Eventの型定義（EventDetailScreenに渡すため）
// （EventListScreenの型定義と一致させます）
interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  // price カラムはクリーンアップで削除済み
}

// スタックで管理する画面の型定義
export type EventStackParamList = {
  EventList: undefined; // EventList画面はパラメータ不要
  EventDetail: { event: Event }; // EventDetail画面はイベント情報が必要
};

// スタックナビゲーターを作成
const Stack = createNativeStackNavigator<EventStackParamList>();

// MainTabNavigatorから渡されるProps
interface Props {
  authToken: string;
}

const EventStackNavigator: React.FC<Props> = ({ authToken }) => {
  // ダークモード用のヘッダースタイル
  const screenOptions = {
    headerStyle: {
      backgroundColor: '#1C1C1E', // ヘッダーの背景色
    },
    headerTitleStyle: {
      color: '#FFFFFF', // ヘッダーの文字色
    },
    headerTintColor: '#0A84FF', // 戻るボタンの色
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* 1. 一番下の画面 (イベント一覧) */}
      <Stack.Screen name="EventList" options={{ headerShown: false }}>
        {/* EventListScreen に authToken を渡す */}
        {() => <EventListScreen authToken={authToken} />}
      </Stack.Screen>

      {/* 2. 積み重なる画面 (イベント詳細) */}
      <Stack.Screen name="EventDetail" options={{ title: 'イベント詳細' }}>
        {() => <EventDetailScreen authToken={authToken} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default EventStackNavigator;
