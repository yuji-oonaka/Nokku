import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { Event } from '../../api/queries';
import EventForm, { EventFormData } from './components/EventForm';

type EventEditScreenRouteProp = RouteProp<
  { params: { eventId: number } },
  'params'
>;

// API形式への変換用ユーティリティ
const formatDateTimeForAPI = (date: Date): string => {
  const dateString = date.toISOString().split('T')[0];
  const timeString = date.toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${dateString} ${timeString}`;
};

const EventEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<EventEditScreenRouteProp>();
  const { eventId } = route.params;

  const [initialData, setInitialData] = useState<Partial<EventFormData> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 1. データ取得
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        Alert.alert('エラー', 'イベントIDが指定されていません。');
        navigation.goBack();
        return;
      }
      try {
        setLoading(true);
        const response = await api.get<Event>(`/events/${eventId}`);
        const event = response.data;

        // EventFormに渡す初期値を構築
        setInitialData({
          title: event.title,
          description: event.description,
          venue: event.venue,
          event_date: new Date(event.event_date),
          image_url: event.image_url,
        });
      } catch (error) {
        console.error('イベント取得エラー:', error);
        Alert.alert('エラー', 'イベント情報の取得に失敗しました。');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigation]);

  // 2. 更新処理
  const handleUpdate = async (data: EventFormData) => {
    setUpdating(true);
    try {
      const formattedEventDate = formatDateTimeForAPI(data.event_date);

      // 変更内容をpayload化
      const payload: any = {
        title: data.title,
        description: data.description,
        venue: data.venue,
        event_date: formattedEventDate,
      };

      // 画像パス（新規アップロードがあればそのパス、なければ既存URLはバックエンド側で無視あるいは維持される想定）
      // ※EventFormは「新規パス」があればそれを `image_url` として返してきます
      if (data.image_url && data.image_url !== initialData?.image_url) {
        payload.image_url = data.image_url;
      }

      await api.put(`/events/${eventId}`, payload);

      Alert.alert('成功', 'イベント情報を更新しました。', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('イベント更新エラー:', error);
      Alert.alert('エラー', 'イベントの更新に失敗しました。');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* initialData がセットされてからレンダリングすることで、
        EventForm 内の useState に正しい初期値が入ります。
      */}
      {initialData && (
        <EventForm
          initialValues={initialData}
          onSubmit={handleUpdate}
          submitLabel="更新する"
          isLoading={updating}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EventEditScreen;
