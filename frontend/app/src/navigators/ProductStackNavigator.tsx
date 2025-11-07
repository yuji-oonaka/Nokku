import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// スクリーンをインポート
import ProductListScreen from '../screens/ProductListScreen';
import PaymentScreen from '../screens/PaymentScreen';

// Productの型（PaymentScreenに渡すため）
interface Product {
  id: number;
  name: string;
  price: number;
}

// スタックで管理する画面の定義
export type ProductStackParamList = {
  ProductList: undefined; // ProductList画面はパラメータ不要
  Payment: { product: Product }; // Payment画面は商品情報が必要
};

// スタックナビゲーターを作成
const Stack = createNativeStackNavigator<ProductStackParamList>();

// MainTabNavigatorから渡されるProps
interface Props {
  authToken: string;
}

const ProductStackNavigator: React.FC<Props> = ({ authToken }) => {
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
      {/* 1. 一番下の画面 (グッズ一覧) */}
      <Stack.Screen name="ProductList" options={{ headerShown: false }}>
        {/*
          ProductListScreen に authToken を渡すため、
          component={} ではなく、children を使ってレンダリングします
        */}
        {() => <ProductListScreen authToken={authToken} />}
      </Stack.Screen>

      {/* 2. 積み重なる画面 (決済画面) */}
      <Stack.Screen name="Payment" options={{ title: '購入手続き' }}>
        {() => <PaymentScreen authToken={authToken} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default ProductStackNavigator;
