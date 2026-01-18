import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (roomName: string) => void;
  isLoading: boolean;
  currentPoints: number; // 現在のポイント
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
  currentPoints,
}) => {
  const [roomName, setRoomName] = useState('');
  const COST = 50; // 消費ポイント

  const handleSubmit = () => {
    if (roomName.trim()) {
      onSubmit(roomName);
      setRoomName(''); // 送信後にクリア
    }
  };

  // ポイント不足判定
  const isShortage = currentPoints < COST;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardView}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>新しいルームを作成</Text>

                {/* ポイント情報エリア */}
                <View style={styles.pointInfoContainer}>
                  <View style={styles.pointRow}>
                    <Text style={styles.pointLabel}>消費ポイント</Text>
                    <Text style={styles.costText}>- {COST} pt</Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Text style={styles.pointLabel}>現在の所持数</Text>
                    <Text style={styles.balanceText}>
                      💎 {currentPoints.toLocaleString()} pt
                    </Text>
                  </View>
                  {isShortage && (
                    <Text style={styles.errorText}>
                      ※ ポイントが不足しています
                    </Text>
                  )}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="ルーム名 (例: 終演後のオフ会)"
                  placeholderTextColor="#888"
                  value={roomName}
                  onChangeText={setRoomName}
                  maxLength={30}
                  autoFocus={visible}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={onClose}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.createButton,
                      (isLoading || !roomName.trim() || isShortage) &&
                        styles.disabledButton,
                    ]}
                    onPress={handleSubmit}
                    disabled={isLoading || !roomName.trim() || isShortage}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.createButtonText}>作成する</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  pointInfoContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pointLabel: { color: '#AAA', fontSize: 14 },
  costText: { color: '#FF453A', fontWeight: 'bold', fontSize: 16 },
  balanceText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#333', marginRight: 8 },
  createButton: { backgroundColor: '#0A84FF', marginLeft: 8 },
  disabledButton: { backgroundColor: '#555', opacity: 0.6 },
  cancelButtonText: { color: '#FFF', fontWeight: '600' },
  createButtonText: { color: '#FFF', fontWeight: 'bold' },
});
