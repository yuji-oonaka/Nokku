import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  instruction: string;
}

export const ScannerGuide: React.FC<Props> = ({ instruction }) => {
  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        <View style={styles.topLeft} />
        <View style={styles.topRight} />
        <View style={styles.bottomLeft} />
        <View style={styles.bottomRight} />
      </View>
      <Text style={styles.text}>{instruction}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  frame: { width: 260, height: 260, position: 'relative' },
  topLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7C4DFF',
  },
  topRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7C4DFF',
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7C4DFF',
  },
  bottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7C4DFF',
  },
  text: {
    color: '#FFF',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'black',
    textShadowRadius: 5,
    lineHeight: 24,
  },
});
