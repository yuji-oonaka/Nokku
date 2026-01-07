import React from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { EventStackParamList } from '../../navigators/EventStackNavigator';

// Hooks & Components
import { useTicketTypeCreate } from '../../hooks/useTicketTypeCreate';
import { TicketTypeForm } from './components/TicketTypeForm';

type TicketTypeCreateRouteProp = RouteProp<
  EventStackParamList,
  'TicketTypeCreate'
>;

const TicketTypeCreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<TicketTypeCreateRouteProp>();
  const event_id = route.params?.event_id;

  // ★ Hookの使用 (ロジック注入)
  const { formState, setters, loading, handleSubmit } = useTicketTypeCreate({
    eventId: event_id,
    onSuccess: () => navigation.goBack(),
  });

  if (!event_id) return null; // エラーハンドリング等は必要に応じて

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ★ UIコンポーネント (表示担当) */}
          <TicketTypeForm
            name={formState.name}
            price={formState.price}
            capacity={formState.capacity}
            seatingType={formState.seatingType}
            loading={loading}
            onNameChange={setters.setName}
            onPriceChange={setters.setPrice}
            onCapacityChange={setters.setCapacity}
            onSeatingTypeChange={setters.setSeatingType}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { padding: 20 },
});

export default TicketTypeCreateScreen;
