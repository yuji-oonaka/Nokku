import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  isFinished: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const EventAdminMenu = ({ isFinished, onEdit, onDelete }: Props) => {
  return (
    <View style={styles.adminSection}>
      <Text style={styles.adminTitle}>管理者メニュー</Text>
      <View style={styles.adminButtons}>
        <TouchableOpacity
          style={[
            styles.adminBtn,
            styles.editBtn,
            isFinished && styles.disabledBtn,
          ]}
          onPress={onEdit}
          disabled={isFinished}
        >
          <Text style={styles.adminBtnText}>
            {isFinished ? '編集不可' : 'イベント編集'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.adminBtn, styles.deleteBtn]}
          onPress={onDelete}
        >
          <Text style={styles.adminBtnText}>削除</Text>
        </TouchableOpacity>
      </View>
      {isFinished && (
        <Text style={styles.adminNote}>
          ※終了したイベントは編集できません。
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  adminSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingBottom: 50,
  },
  adminTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  adminButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  adminBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  editBtn: { backgroundColor: '#0A84FF' },
  deleteBtn: { backgroundColor: '#FF3B30' },
  disabledBtn: { backgroundColor: '#555' },
  adminBtnText: { color: '#FFF', fontWeight: 'bold' },
  adminNote: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default EventAdminMenu;
