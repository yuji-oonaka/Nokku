import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api'; // 1. ★ api.ts をインポート
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// 2. ★ EventStackNavigator の型定義をインポート
import { EventStackParamList } from '../navigators/EventStackNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

// 3. ★ Props (authToken) を削除
// interface Props {
//   authToken: string;
// }

// 4. ★ route.params から event_id を受け取るための型定義
type TicketTypeCreateRouteProp = RouteProp<
  EventStackParamList,
  'TicketTypeCreate'
>;

const TicketTypeCreateScreen: React.FC = () => {
  // 5. ★ Props を削除
  const navigation = useNavigation();
  const route = useRoute<TicketTypeCreateRouteProp>();

  // 6. ★ route.params から event_id を取得
  const event_id = route.params?.event_id;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  // seating_type は 'random' か 'free' ですが、
  // ここでは簡略化のため 'random' に固定します（後でUIを追加できます）

  const [loading, setLoading] = useState(false);

  // 7. ★ handleSubmit を api.ts を使うように修正
  const handleSubmit = async () => {
    const priceNum = parseInt(price, 10);
    const capacityNum = parseInt(capacity, 10);

    if (!name || isNaN(priceNum) || isNaN(capacityNum) || !event_id) {
      Alert.alert('エラー', 'すべての項目を正しく入力してください。');
      return;
    }

    setLoading(true);
    try {
      // 8. ★ api.post('/ticket-types') を呼び出す
      await api.post('/ticket-types', {
        event_id: event_id, // 必須
        name: name,
        price: priceNum,
        capacity: capacityNum,
        seating_type: 'random', // デフォルト（または 'free'）
      });

      Alert.alert('成功', '新しい券種を作成しました。');
      navigation.goBack(); // イベント詳細画面に戻る
    } catch (error: any) {
      console.error('券種作成エラー:', error);
      let message = '券種の作成に失敗しました。';
      if (error.response && error.response.data.message) {
        message = error.response.data.message;
      }
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  if (!event_id) {
    // event_id が渡されていない（あり得ないが念のため）
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.label}>エラー: イベントIDがありません。</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>券種名</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: S席"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>価格 (円)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="8000"
          keyboardType="numeric"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>キャパシティ（席数）</Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={setCapacity}
          placeholder="100"
          keyboardType="numeric"
          placeholderTextColor="#888"
        />

        {/* TODO: seating_type (ランダム/自由席) を選択するUI (Picker) を追加 */}

        {loading ? (
          <ActivityIndicator size="large" style={styles.buttonSpacing} />
        ) : (
          <View style={styles.buttonSpacing}>
            <Button title="券種を作成" onPress={handleSubmit} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// (スタイルは ProductCreateScreen と共通)
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
  buttonSpacing: {
    marginTop: 20,
  },
});

export default TicketTypeCreateScreen;
