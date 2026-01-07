import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScanMode } from '../../../hooks/useGateScanner';

interface Props {
  currentMode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  disabled: boolean;
}

const TabIcon = ({ name, active }: { name: string; active: boolean }) => (
  <Text style={{ fontSize: 20, marginRight: 8, opacity: active ? 1 : 0.5 }}>
    {name === 'ticket' ? '🎫' : '🛍️'}
  </Text>
);

export const ScannerModeSelector: React.FC<Props> = ({
  currentMode,
  onModeChange,
  disabled,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, currentMode === 'ticket' && styles.activeButton]}
        onPress={() => onModeChange('ticket')}
        disabled={disabled}
      >
        <TabIcon name="ticket" active={currentMode === 'ticket'} />
        <Text
          style={[styles.text, currentMode === 'ticket' && styles.activeText]}
        >
          チケット入場
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, currentMode === 'order' && styles.activeButton]}
        onPress={() => onModeChange('order')}
        disabled={disabled}
      >
        <TabIcon name="product" active={currentMode === 'order'} />
        <Text
          style={[styles.text, currentMode === 'order' && styles.activeText]}
        >
          グッズ引換
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(40,40,40,0.9)',
    borderRadius: 30,
    padding: 4,
    marginTop: 20, // 上部に少し余白
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 26,
  },
  activeButton: { backgroundColor: '#7C4DFF' },
  text: { color: '#888', fontWeight: '600', fontSize: 14 },
  activeText: { color: '#FFF', fontWeight: 'bold' },
});
