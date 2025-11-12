import React from 'react';
// 1. ★ 'stack' をインポート (native-stack ではない)
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native'; // ログアウトボタン用

// スクリーンをインポート
import ProductListScreen from '../screens/ProductListScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ProductEditScreen from '../screens/ProductEditScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';

// 2. ★ ProductStackParamList の型定義を修正
export type ProductStackParamList = {
  ProductList: undefined;
  Payment: { product: { id: number; name: string; price: number } }; // PaymentScreen が受け取る型
  ProductEdit: { productId: number }; // ProductEditScreen が受け取る型
  ProductDetail: { productId: number };
};

// スタックナビゲーターを作成
const Stack = createStackNavigator<ProductStackParamList>();

// MainTabNavigatorから渡されるProps
interface Props {
  // 3. ★ authToken は不要になったので削除
  // authToken: string;
  onLogout: () => void; // ログアウト処理の関数
}

// 4. ★ LogoutButton をここで定義
const LogoutButton = ({ onLogout }: { onLogout: () => void }) => (
  <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
    <Text style={styles.logoutButtonText}>ログアウト</Text>
  </TouchableOpacity>
);

// 5. ★ Props から authToken を削除
const ProductStackNavigator: React.FC<Props> = ({ onLogout }) => {
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
      {/* 1. 一番下の画面 (グッズ一覧) */}
      <Stack.Screen
        name="ProductList"
        // 6. ★ 'component' prop を使うように修正
        component={ProductListScreen}
        options={{
          title: 'グッズ一覧',
          headerRight: () => <LogoutButton onLogout={onLogout} />,
        }}
        // 7. ★レンダープロップ {() => ...} を削除
      />

      {/* 2. 積み重なる画面 (決済) */}
      <Stack.Screen
        name="Payment"
        component={PaymentScreen} // 'component' prop を使う
        options={{ title: '購入手続き' }}
      />

      {/* 3. グッズ編集画面 */}
      <Stack.Screen
        name="ProductEdit"
        component={ProductEditScreen}
        options={{ title: 'グッズ編集' }}
      />

      {/* 4. グッズ詳細画面 (新規追加) */}
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'グッズ詳細' }} // ヘッダータイトル
      />
    </Stack.Navigator>
  );
};

// 8. ★ styles を追加
const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 15,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});

export default ProductStackNavigator;
