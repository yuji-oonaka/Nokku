import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export const SecurityClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.clockContainer}>
      <Text style={styles.clockText}>
        {time.toLocaleTimeString('ja-JP', { hour12: false })}
      </Text>
      <Text style={styles.clockSubText}>Current Time (Secured)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  clockContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    width: '100%',
  },
  clockText: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#333',
  },
  clockSubText: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
