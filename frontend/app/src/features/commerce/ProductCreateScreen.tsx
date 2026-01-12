import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
// 共通フォームをインポート
import ProductForm, { ProductFormData } from './components/ProductForm';

const ProductCreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  // 送信処理 (ProductFormからデータを受け取る)
  const handleCreate = async (data: ProductFormData) => {
    setLoading(true);
    try {
      // image_url が undefined の場合、JSONに含まれないかnullとして送るかはAPI仕様次第ですが
      // ここではそのまま送ります (undefinedならキーが消える、あるいはnullにするなら調整)
      await api.post('/products', data);

      Alert.alert('成功', '新しいグッズを作成しました。');
      navigation.goBack();
    } catch (error: any) {
      console.error('グッズ作成エラー:', error);
      const message = error.response?.data?.message || '作成に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProductForm
        onSubmit={handleCreate}
        submitLabel="グッズを作成"
        isLoading={loading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});

export default ProductCreateScreen;
