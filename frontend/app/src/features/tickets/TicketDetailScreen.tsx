import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';

// Hooks & Components
import { useTicketDetail } from '../../hooks/useTicketDetail';
import { TicketInfoCard } from './components/TicketInfoCard';
import { TicketStatusSection } from './components/TicketStatusSection';

type TicketDetailRouteProp = RouteProp<MyPageStackParamList, 'TicketDetail'>;

const TicketDetailScreen: React.FC = () => {
  const route = useRoute<TicketDetailRouteProp>();

  // ★ ロジック呼び出し
  const { ticket, isEventFinished } = useTicketDetail(route.params.ticket);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* イベント情報カード */}
        <TicketInfoCard ticket={ticket} />

        {/* チケット状態表示エリア (QR or 入場済) */}
        <View style={styles.mainStatusArea}>
          <TicketStatusSection
            ticket={ticket}
            isEventFinished={isEventFinished}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { padding: 20, alignItems: 'center' },
  mainStatusArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
});

export default TicketDetailScreen;
