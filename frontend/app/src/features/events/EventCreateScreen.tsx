import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import EventForm, { EventFormData } from './components/EventForm';

const formatDateTimeForAPI = (date: Date): string => {
  // ISO形式等、バックエンドの要求に合わせて整形
  const dateString = date.toISOString().split('T')[0];
  const timeString = date.toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${dateString} ${timeString}`;
};

const EventCreateScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async (data: EventFormData) => {
    setLoading(true);
    try {
      const formattedDate = formatDateTimeForAPI(data.event_date);

      await api.post('/events', {
        title: data.title,
        description: data.description,
        venue: data.venue,
        event_date: formattedDate,
        image_url: data.image_url,
      });

      Alert.alert('成功', '新しいイベントを作成しました。');
      navigation.goBack();
    } catch (error: any) {
      console.error('イベント作成エラー:', error);
      const message =
        error.response?.data?.message || 'イベントの作成に失敗しました。';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <EventForm
        onSubmit={handleCreateEvent}
        submitLabel="イベントを作成"
        isLoading={loading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default EventCreateScreen;
