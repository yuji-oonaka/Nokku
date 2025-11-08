import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView,
  ActivityIndicator,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'http://10.0.2.2';

interface Props {
  authToken: string;
}

// EventDetailScreenから渡されるパラメータの型
type RouteParams = {
  event_id: number;
};

const TicketTypeCreateScreen: React.FC<Props> = ({ authToken }) => {
  const navigation = useNavigation();
  const route = useRoute();

  // 前の画面から 'event_id' を受け取る
  const { event_id } = route.params as RouteParams;

  // フォーム用の状態
  const [name, setName] = useState(''); // S席, A席...
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [seatingType, setSeatingType] = useState<'random' | 'free'>('random'); // デフォルトは 'random'

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !price || !capacity) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ticket-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          event_id: event_id, // 👈 渡された event_id を使う
          name: name,
          price: parseInt(price, 10),
          capacity: parseInt(capacity, 10),
          seating_type: seatingType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.message || '券種の作成に失敗しました';
        if (response.status === 403) {
          errorMsg = '権限エラー: このイベントの券種を作成できません。';
        }
        throw new Error(errorMsg);
      }

      // 成功
      Alert.alert('成功', `券種「${data.name}」が作成されました！`);

      // 成功したら前の画面（イベント詳細）に戻る
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('作成エラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.header}>新しい券種を作成</Text>
        <Text style={styles.subHeader}>Event ID: {event_id} に追加</Text>

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
          placeholder="例: 8000"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />

        <Text style={styles.label}>販売枚数（キャパシティ）</Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={setCapacity}
          placeholder="例: 100"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />

        <Text style={styles.label}>座席タイプ</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={seatingType}
            style={styles.picker}
            onValueChange={itemValue =>
              setSeatingType(itemValue as 'random' | 'free')
            }
            dropdownIconColor="#FFFFFF"
          >
            <Picker.Item
              label="ランダム指定席 (例: S席-1)"
              value="random"
              color="#FFFFFF"
            />
            <Picker.Item
              label="自由席 (例: 自由席-1)"
              value="free"
              color="#FFFFFF"
            />
          </Picker>
        </View>

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <Button title="この券種を作成" onPress={handleSubmit} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- スタイルシート ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subHeader: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 20,
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
  },
  pickerContainer: {
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#333',
    marginBottom: 15,
  },
  picker: {
    height: 50,
    color: '#FFFFFF',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default TicketTypeCreateScreen;
