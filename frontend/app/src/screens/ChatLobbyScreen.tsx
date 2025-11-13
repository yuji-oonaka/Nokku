import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { EventStackParamList } from '../navigators/EventStackNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

// ナビゲーションパラメータの型
type ChatLobbyScreenRouteProp = RouteProp<EventStackParamList, 'ChatLobby'>;
type ChatLobbyScreenNavigationProp = StackNavigationProp<
  EventStackParamList,
  'ChatLobby'
>;
// 固定のスレッド一覧データ (Firestoreに保存するまで、これで代用)
const THREADS = [
  { id: 'general', title: '🙌 雑談・自己紹介スレッド', description: '自由に挨拶や雑談をどうぞ' },
  { id: 'goods', title: '🛍️ グッズ交換・売買スレッド', description: '会場での取引や事前相談に' },
  { id: 'setlist', title: '🎼 セットリスト予想スレッド', description: 'ライブ直前まで盛り上がろう' },
  { id: 'after_live', title: '🔥 ライブ後の感想スレッド', description: '終わってからの興奮を共有！' },
];

const ChatLobbyScreen = () => {
  const route = useRoute<ChatLobbyScreenRouteProp>();
  const navigation = useNavigation<ChatLobbyScreenNavigationProp>();
  const { eventId, eventTitle } = route.params;

  // スレッドを選択したときの処理
  const handleThreadPress = (threadId: string, threadTitle: string) => {
    navigation.navigate('Chat', { 
      eventId: eventId, 
      eventTitle: eventTitle,
      threadId: threadId, 
      threadTitle: threadTitle 
    });
  };

  const renderThreadItem = ({ item }: { item: typeof THREADS[0] }) => (
    <TouchableOpacity 
      style={styles.threadItem}
      onPress={() => handleThreadPress(item.id, item.title)}
    >
      <View>
        <Text style={styles.threadTitle}>{item.title}</Text>
        <Text style={styles.threadDescription}>{item.description}</Text>
      </View>
      <Text style={styles.threadArrow}></Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>
        {eventTitle} のチャットグループ一覧
      </Text>
      <FlatList
        data={THREADS}
        renderItem={renderThreadItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  threadItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  threadTitle: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  threadDescription: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  threadArrow: {
    color: '#555555',
    fontSize: 20,
    fontWeight: '300',
  }
});

export default ChatLobbyScreen;