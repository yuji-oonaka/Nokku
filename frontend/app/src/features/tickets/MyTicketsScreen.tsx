import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MyPageStackParamList } from '../../navigators/MyPageStackNavigator';
import { useQuery } from '@tanstack/react-query';
import { UserTicket, fetchMyTickets } from '../../api/queries';
import TicketListItem from './components/TicketListItem'; // 作成したコンポーネントをインポート

type MyTicketsNavigationProp = StackNavigationProp<
  MyPageStackParamList,
  'MyTickets'
>;

const MyTicketsScreen: React.FC = () => {
  const navigation = useNavigation<MyTicketsNavigationProp>();

  const {
    data: myTickets,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['myTickets'],
    queryFn: fetchMyTickets,
    // UX改善: チケット使用後のステータス反映を早めるため30秒に短縮
    staleTime: 1000 * 30,
  });

  // 詳細へ遷移 (useCallbackでメモ化し、TicketListItemの再レンダリングを抑制)
  const handlePressTicket = useCallback(
    (ticket: UserTicket) => {
      navigation.navigate('TicketDetail', { ticket });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>チケットの取得に失敗しました。</Text>
        </View>
      ) : !myTickets || myTickets.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>購入済みのチケットはありません</Text>
        </View>
      ) : (
        <FlatList
          data={myTickets}
          // renderItemはインライン関数にせず、直接コンポーネントを返す形が理想だが
          // propsを渡す必要があるため、ここでは軽量なラッパーを使用
          renderItem={({ item }) => (
            <TicketListItem item={item} onPress={handlePressTicket} />
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  listContent: {
    padding: 10,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
  },
});

export default MyTicketsScreen;
