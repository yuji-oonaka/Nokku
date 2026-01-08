import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (id: string) => void;
}

export const ManualEntryModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [inputId, setInputId] = useState('');

  const handleSubmit = () => {
    if (!inputId.trim()) return;
    onSubmit(inputId);
    setInputId(''); // 送信後クリア
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.title}>チケットID入力</Text>
          <Text style={styles.subtitle}>
            お客様の画面に表示されている数字を入力してください
          </Text>

          <TextInput
            style={styles.input}
            value={inputId}
            onChangeText={setInputId}
            placeholder="例: 1045"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            autoFocus
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, !inputId && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!inputId}
            >
              <Text style={styles.submitText}>確定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 30,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 30,
    backgroundColor: '#7C4DFF',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelText: {
    color: '#FFF',
    fontWeight: '600',
  },
  submitText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
