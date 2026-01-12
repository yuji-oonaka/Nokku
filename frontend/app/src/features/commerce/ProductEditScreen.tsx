import React, { useState } from 'react';
import {
  StyleSheet,
  Alert,
  View,
  ActivityIndicator,
  Text,
  Button,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // React Queryを使うと楽です
import api from '../../services/api';
import { fetchProductById } from '../../api/queries';
// 共通フォームをインポート
import ProductForm, { ProductFormData } from './components/ProductForm';

type ProductEditScreenRouteProp = RouteProp<
  { params: { productId: number } },
  'params'
>;

const ProductEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ProductEditScreenRouteProp>();
  const { productId } = route.params;
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. 初期データ取得 (React Queryを活用してシンプルに)
  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId),
  });

  // 2. 更新処理
  const handleUpdate = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await api.put(`/products/${productId}`, data);

      Alert.alert('成功', 'グッズ情報を更新しました。', [
        {
          text: 'OK',
          onPress: () => {
            // キャッシュを更新して戻る
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', productId] });
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('グッズ更新エラー:', error);
      const message = error.response?.data?.message || '更新に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>情報の取得に失敗しました</Text>
        <Button title="再試行" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProductForm
        initialValues={product} // 初期値を渡すだけでフォームが埋まる
        onSubmit={handleUpdate}
        submitLabel="更新する"
        isLoading={isSubmitting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FFF', marginBottom: 20 },
});

export default ProductEditScreen;
