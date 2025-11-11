import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import api from '../services/api'; // 1. ★ api.ts をインポート
import { useNavigation } from '@react-navigation/native';

// 2. ★ Props (authToken) を削除
// interface Props {
//   authToken: string;
// }

const ProductCreateScreen: React.FC = () => {
  // 3. ★ Props を削除
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // 文字列として保持
  const [stock, setStock] = useState(''); // 文字列として保持
  const [imageUrl, setImageUrl] = useState('');

  const [loading, setLoading] = useState(false);

  // 4. ★ handleSubmit を api.ts を使うように修正
  const handleSubmit = async () => {
    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    // バリデーション
    if (!name || !description || isNaN(priceNum) || isNaN(stockNum)) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    setLoading(true);
    try {
      // 5. ★ api.post('/products') を呼び出す
      await api.post('/products', {
        name: name,
        description: description,
        price: priceNum,
        stock: stockNum,
        image_url: imageUrl || null,
      });

      Alert.alert('成功', '新しいグッズを作成しました。');
      navigation.goBack(); // マイページに戻る
    } catch (error: any) {
      console.error('グッズ作成エラー:', error);
      let message = 'グッズの作成に失敗しました。';
      if (error.response && error.response.data.message) {
        message = error.response.data.message;
      }
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.form}>
          <Text style={styles.label}>グッズ名</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tシャツ"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>グッズ説明</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="グッズの詳細..."
            placeholderTextColor="#888"
            multiline
          />

          <Text style={styles.label}>価格 (円)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="3000"
            keyboardType="numeric"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>在庫数</Text>
          <TextInput
            style={styles.input}
            value={stock}
            onChangeText={setStock}
            placeholder="100"
            keyboardType="numeric"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>画像URL (任意)</Text>
          <TextInput
            style={styles.input}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            placeholderTextColor="#888"
          />

          {loading ? (
            <ActivityIndicator size="large" style={styles.buttonSpacing} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button title="グッズを作成" onPress={handleSubmit} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 6. ★ スタイルを EventCreateScreen と統一
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  form: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonSpacing: {
    marginTop: 20,
  },
});

export default ProductCreateScreen;
