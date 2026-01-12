import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { ProfileFormData } from './ProfileBasicForm'; // 型定義をインポート

interface Props {
  formData: ProfileFormData;
  onChange: (key: keyof ProfileFormData, value: string) => void;
}

export const ProfileAddressForm: React.FC<Props> = ({ formData, onChange }) => {
  return (
    <View>
      <Text style={styles.groupTitle}>配送先・連絡先 (任意)</Text>
      <Text style={styles.subText}>
        グッズ購入時の配送先として使用されます。
      </Text>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>郵便番号</Text>
          <TextInput
            style={styles.input}
            value={formData.postalCode}
            onChangeText={text => onChange('postalCode', text)}
            placeholder="123-4567"
            placeholderTextColor="#888"
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>電話番号</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={text => onChange('phone', text)}
            placeholder="090..."
            placeholderTextColor="#888"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>都道府県</Text>
      <TextInput
        style={styles.input}
        value={formData.prefecture}
        onChangeText={text => onChange('prefecture', text)}
        placeholder="東京都"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>市区町村・番地</Text>
      <TextInput
        style={styles.input}
        value={formData.city}
        onChangeText={text => onChange('city', text)}
        placeholder="渋谷区..."
        placeholderTextColor="#888"
      />
      <TextInput
        style={[styles.input, { marginTop: 10 }]}
        value={formData.address1}
        onChangeText={text => onChange('address1', text)}
        placeholder="恵比寿1-2-3..."
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>建物名・部屋番号</Text>
      <TextInput
        style={styles.input}
        value={formData.address2}
        onChangeText={text => onChange('address2', text)}
        placeholder="アパート101号室"
        placeholderTextColor="#888"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 5,
  },
  subText: { fontSize: 12, color: '#AAA', marginBottom: 15 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    color: '#DDD',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
