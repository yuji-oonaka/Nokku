import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SeatingTypeSelector } from './SeatingTypeSelector';
import { SeatingType } from '../../../hooks/useTicketTypeCreate';

interface Props {
  name: string;
  price: string;
  capacity: string;
  seatingType: SeatingType;
  loading: boolean;
  onNameChange: (text: string) => void;
  onPriceChange: (text: string) => void;
  onCapacityChange: (text: string) => void;
  onSeatingTypeChange: (type: SeatingType) => void;
  onSubmit: () => void;
}

export const TicketTypeForm: React.FC<Props> = ({
  name,
  price,
  capacity,
  seatingType,
  loading,
  onNameChange,
  onPriceChange,
  onCapacityChange,
  onSeatingTypeChange,
  onSubmit,
}) => {
  return (
    <View style={styles.formCard}>
      <Text style={styles.headerTitle}>チケット設定</Text>

      {/* 券種名 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          券種名 <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onNameChange}
          placeholder="例: S席, VIP, スタンディング"
          placeholderTextColor="#666"
        />
      </View>

      {/* 価格 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          価格 (円) <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={onPriceChange}
          placeholder="例: 8000"
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>

      {/* キャパシティ */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          販売枚数 (席数) <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={onCapacityChange}
          placeholder="例: 100"
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>

      {/* 座席タイプ選択 (Components利用) */}
      <SeatingTypeSelector value={seatingType} onChange={onSeatingTypeChange} />

      {/* 送信ボタン */}
      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#7C4DFF" />
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
            <Text style={styles.submitButtonText}>券種を作成する</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#CCC', marginBottom: 8 },
  required: { color: '#FF3B30' },
  input: {
    height: 50,
    backgroundColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonContainer: { marginTop: 10 },
  submitButton: {
    backgroundColor: '#7C4DFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
