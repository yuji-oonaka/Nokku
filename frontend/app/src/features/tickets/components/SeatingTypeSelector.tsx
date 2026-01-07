import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SeatingType } from '../../../hooks/useTicketTypeCreate';

interface Props {
  value: SeatingType;
  onChange: (type: SeatingType) => void;
}

export const SeatingTypeSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>座席タイプ</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            value === 'random' && styles.toggleActive,
          ]}
          onPress={() => onChange('random')}
        >
          <Text
            style={[
              styles.toggleText,
              value === 'random' && styles.toggleTextActive,
            ]}
          >
            指定席 (自動割当)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, value === 'free' && styles.toggleActive]}
          onPress={() => onChange('free')}
        >
          <Text
            style={[
              styles.toggleText,
              value === 'free' && styles.toggleTextActive,
            ]}
          >
            自由席 / 整理番号
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.helperText}>
        {value === 'random'
          ? 'システムが自動で座席番号(例: A-12)を割り振ります。'
          : '座席指定はありません。整理番号のみ発行されます。'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#CCC', marginBottom: 8 },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: { backgroundColor: '#333' },
  toggleText: { color: '#666', fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: '#FFF', fontWeight: 'bold' },
  helperText: { color: '#666', fontSize: 12, marginTop: 8 },
});
