import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export const BlinkingIndicator: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <View style={styles.blinkContainer}>
      <Animated.View style={[styles.blinkDot, { opacity }]} />
      <Text style={styles.blinkText}>Authentication Active</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  blinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  blinkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  blinkText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
