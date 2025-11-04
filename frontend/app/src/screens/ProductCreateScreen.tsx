import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView,
  ActivityIndicator,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // タブ切り替え用

const API_URL = 'http://10.0.2.2';

interface Props {
  authToken: string;
}

const ProductCreateScreen: React.FC<Props> = ({ authToken }) => {
  const navigation = useNavigation();

  // フォーム用の状態
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState(''); // 任意

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // 必須項目のみ簡易バリデーション
    if (!name || !description || !price || !stock) {
      Alert.alert('エラー', '画像URL以外の項目はすべて必須です');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        // 👈 APIを /api/products に変更
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: name,
          description: description,
          price: parseInt(price, 10),
          stock: parseInt(stock, 10),
          image_url: imageUrl || null, // 空文字の場合はnullを送る
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.message || 'グッズの作成に失敗しました';
        if (response.status === 403) {
          errorMsg = '権限エラー: アーティストまたは管理者のみ作成可能です。';
        }
        throw new Error(errorMsg);
      }

      // 成功
      Alert.alert('成功', '新しいグッズが作成されました！');

      // フォームをクリア
      setName('');
      setDescription('');
      setPrice('');
      setStock('');
      setImageUrl('');

      // 👈 「Products」（グッズ一覧）タブに自動で画面遷移
      navigation.navigate('Products');
    } catch (error: any) {
      Alert.alert('作成エラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.label}>グッズ名</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: NOKKU ツアー Tシャツ"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>価格 (円)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="例: 3500"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />

        <Text style={styles.label}>在庫数</Text>
        <TextInput
          style={styles.input}
          value={stock}
          onChangeText={setStock}
          placeholder="例: 500"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />

        <Text style={styles.label}>画像URL (任意)</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="例: https://example.com/image.png"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>グッズ詳細</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="グッズの詳細説明..."
          placeholderTextColor="#888"
          multiline
        />

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <Button title="グッズを作成" onPress={handleSubmit} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイルシート (EventCreateScreenからコピー) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    height: 50,
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    backgroundColor: '#333',
    fontSize: 16,
    marginBottom: 15,
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default ProductCreateScreen;
