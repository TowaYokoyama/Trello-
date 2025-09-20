import React, { useState, useEffect, useCallback } from 'react';
import { 
  Platform,
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  ActivityIndicator, 
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../../src/api/client';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';

// --- 型定義 ---
interface Board {
  id: number;
  title: string;
  description: string | null;
  owner_id: number;
}

interface List {
  id: number;
  title: string;
  board_id: number;
  cards: Card[];
}

interface Card {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  list_id: number;
}

const { width, height } = Dimensions.get('window');

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams();
  const boardId = typeof id === 'string' ? parseInt(id) : undefined;
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newCardInputs, setNewCardInputs] = useState<{[key: number]: string}>({});
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchBoardDetails = async () => {
    if (!boardId) return;
    try {
      setIsLoading(true);
      const boardResponse = await apiClient.get<Board>(`/api/boards/${boardId}`);
      setBoard(boardResponse.data);
      const listsResponse = await apiClient.get<List[]>(`/api/boards/${boardId}/lists/`);
      setLists(Array.isArray(listsResponse.data) ? listsResponse.data : []);
    } catch (error) {
      console.error('Failed to fetch board details', error);
      Alert.alert('エラー', 'ボードの詳細を取得できませんでした。');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBoardDetails(); }, [boardId]));

  const handleAddList = async () => {
    if (!boardId || newListName.trim() === '') return;
    try {
      const response = await apiClient.post<List>(`/api/boards/${boardId}/lists/`, { title: newListName });
      const currentLists = Array.isArray(lists) ? lists : [];
      setLists([...currentLists, { ...response.data, cards: response.data.cards || [] }]);
      setNewListName('');
    } catch (error) {
      console.error('Failed to add list', error);
      Alert.alert('エラー', 'リストを追加できませんでした。');
    }
  };

  const deleteList = async (listId: number) => {
    try {
      await apiClient.delete(`/api/lists/${listId}`);
      const currentLists = Array.isArray(lists) ? lists : [];
      setLists(currentLists.filter(l => l.id !== listId));
    } catch (error) {
      console.error('Failed to delete list', error);
      Alert.alert('エラー', 'リストを削除できませんでした。');
    }
  };

  const handleDeleteList = (listId: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this list?')) {
        deleteList(listId);
      }
    } else {
      Alert.alert('リストを削除', '本当にこのリストを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => deleteList(listId) },
      ]);
    }
  };

  const handleAddCard = async (listId: number, cardTitle: string) => {
    if (cardTitle.trim() === '') return;
    try {
      const response = await apiClient.post<Card>(`/api/lists/${listId}/cards/`, { title: cardTitle });
      const currentLists = Array.isArray(lists) ? lists : [];
      setLists(currentLists.map(list => 
        list.id === listId ? { ...list, cards: Array.isArray(list.cards) ? [...list.cards, response.data] : [response.data] } : list
      ));
      setNewCardInputs({ ...newCardInputs, [listId]: '' });
    } catch (error) {
      console.error('Failed to add card', error);
      Alert.alert('エラー', 'カードを追加できませんでした。');
    }
  };

  const deleteCard = async (listId: number, cardId: number) => {
    try {
      await apiClient.delete(`/api/cards/${cardId}`);
      const currentLists = Array.isArray(lists) ? lists : [];
      setLists(currentLists.map(list => 
        list.id === listId ? { ...list, cards: Array.isArray(list.cards) ? list.cards.filter(card => card.id !== cardId) : [] } : list
      ));
    } catch (error) {
      console.error('Failed to delete card', error);
      Alert.alert('エラー', 'カードを削除できませんでした。');
    }
  };

  const handleDeleteCard = (listId: number, cardId: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this card?')) {
        deleteCard(listId, cardId);
      }
    } else {
      Alert.alert('Delete Card', 'Are you sure you want to delete this card?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCard(listId, cardId) },
      ]);
    }
  };

  const handleToggleCardComplete = async (listId: number, card: Card) => {
    try {
      const updatedCard = { ...card, completed: !card.completed };
      await apiClient.put(`/api/cards/${card.id}`, { completed: updatedCard.completed });
      const currentLists = Array.isArray(lists) ? lists : [];
      setLists(currentLists.map(list => 
        list.id === listId ? { ...list, cards: Array.isArray(list.cards) ? list.cards.map(c => (c.id === card.id ? updatedCard : c)) : [] } : list
      ));
    } catch (error) {
      console.error('Failed to update card', error);
      Alert.alert('エラー', 'カードを更新できませんでした。');
    }
  };

  const getListEmoji = (index: number) => {
    const emojis = ['📋', '🔄', '✅', '🎯', '📊', '🚀', '💡', '⚡', '🌟', '🔥'];
    return emojis[index % emojis.length];
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#64ffda" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </LinearGradient>
    );
  }

  if (!board) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Text style={styles.errorText}>ボードが見つかりません。</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <Text style={styles.boardTitle}>{board.title}</Text>
            {board.description && <Text style={styles.boardDescription}>{board.description}</Text>}
          </View>

          <View style={styles.addListContainer}>
            <View style={styles.addListInputContainer}>
              <TextInput style={styles.addListInput} placeholder="新しいリストを追加..." placeholderTextColor="rgba(100, 255, 218, 0.6)" value={newListName} onChangeText={setNewListName} onSubmitEditing={handleAddList} />
              <TouchableOpacity style={styles.addListButton} onPress={handleAddList}>
                <Text style={styles.addListButtonText}>➕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={Array.isArray(lists) ? lists : []}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listsContainer}
            renderItem={({ item: list, index }) => (
              <View style={styles.listCard}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>{getListEmoji(index)} {list.title}</Text>
                  <TouchableOpacity onPress={() => handleDeleteList(list.id)} style={styles.deleteListButton}>
                    <Text style={styles.deleteListButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.cardsContainer} showsVerticalScrollIndicator={false}>
                  {Array.isArray(list.cards) && list.cards.map((card) => (
                    <TouchableOpacity key={card.id} onPress={() => handleToggleCardComplete(list.id, card)} style={[styles.cardItem, card.completed && styles.cardItemCompleted]}>
                      <View style={styles.cardContent}>
                        <View style={[styles.checkbox, card.completed && styles.checkboxCompleted]}>
                          {card.completed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.cardText, card.completed && styles.cardTextCompleted]}>{card.title}</Text>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteCard(list.id, card.id); }} style={styles.deleteCardButton}>
                          <Text style={styles.deleteCardButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.addCardContainer}>
                  <TextInput style={styles.addCardInput} placeholder="新しいカードを追加..." placeholderTextColor="rgba(100, 255, 218, 0.6)" value={newCardInputs[list.id] || ''} onChangeText={(text) => setNewCardInputs({ ...newCardInputs, [list.id]: text })} onSubmitEditing={({ nativeEvent: { text } }) => { if (text.trim()) { handleAddCard(list.id, text); } }} />
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>📋</Text>
                <Text style={styles.emptyListSubText}>最初のリストを追加してください</Text>
              </View>
            )}
          />
        </Animated.View>
      </ScrollView>
      <View style={styles.backgroundDecoration}>
        <Animated.View style={[styles.floatingCircle, styles.circle1, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.floatingCircle, styles.circle2, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.floatingCircle, styles.circle3, { opacity: fadeAnim }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingTop: 60, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64ffda', fontSize: 18, marginTop: 20, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 30 },
  boardTitle: { fontSize: 36, fontWeight: 'bold', color: '#64ffda', textAlign: 'center', marginBottom: 8, textShadowColor: 'rgba(100, 255, 218, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  boardDescription: { fontSize: 18, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 26, paddingHorizontal: 20 },
  errorText: { textAlign: 'center', marginTop: 100, fontSize: 18, color: '#64ffda', fontWeight: '600' },
  addListContainer: { marginBottom: 30, alignItems: 'center' },
  addListInputContainer: { flexDirection: 'row', backgroundColor: 'rgba(100, 255, 218, 0.1)', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 5, width: '95%', borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.3)', shadowColor: '#64ffda', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  addListInput: { flex: 1, color: '#64ffda', fontSize: 16, paddingVertical: 15, fontWeight: '500' },
  addListButton: { backgroundColor: 'rgba(100, 255, 218, 0.2)', borderRadius: 20, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  addListButtonText: { fontSize: 22 },
  listsContainer: { paddingVertical: 10 },
  listCard: { width: width * 0.85, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 25, padding: 20, marginRight: 15, borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.2)', shadowColor: '#64ffda', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10, height: height * 0.65 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  listTitle: { fontSize: 22, fontWeight: 'bold', color: '#64ffda', flex: 1 },
  deleteListButton: { padding: 8, borderRadius: 15, backgroundColor: 'rgba(255, 82, 82, 0.2)' },
  deleteListButtonText: { fontSize: 18 },
  cardsContainer: { flex: 1, marginBottom: 20 },
  cardItem: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 18, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, borderLeftWidth: 4, borderLeftColor: '#64ffda' },
  cardItemCompleted: { backgroundColor: 'rgba(255, 255, 255, 0.6)', borderLeftColor: '#4caf50' },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#64ffda', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  checkboxCompleted: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  checkmark: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  cardText: { flex: 1, fontSize: 16, color: '#1a1a2e', fontWeight: '600', lineHeight: 22 },
  cardTextCompleted: { textDecorationLine: 'line-through', color: '#6B7280' },
  deleteCardButton: { padding: 5 },
  deleteCardButtonText: { fontSize: 18, color: '#ff5252', fontWeight: 'bold' },
  addCardContainer: { backgroundColor: 'rgba(100, 255, 218, 0.15)', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.3)' },
  addCardInput: { color: '#64ffda', fontSize: 16, paddingVertical: 15, fontWeight: '500' },
  emptyListContainer: { width: width * 0.85, height: height * 0.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 25, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(100, 255, 218, 0.3)', marginRight: 15 },
  emptyListText: { fontSize: 60, marginBottom: 20 },
  emptyListSubText: { color: 'rgba(100, 255, 218, 0.7)', fontSize: 18, textAlign: 'center', fontWeight: '600', paddingHorizontal: 40 },
  backgroundDecoration: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
  floatingCircle: { position: 'absolute', borderRadius: 200, backgroundColor: 'rgba(100, 255, 218, 0.1)' },
  circle1: { width: 300, height: 300, top: 100, left: -100 },
  circle2: { width: 200, height: 200, bottom: 200, right: -50, backgroundColor: 'rgba(138, 43, 226, 0.1)' },
  circle3: { width: 150, height: 150, top: 300, right: 50, backgroundColor: 'rgba(255, 20, 147, 0.1)' },
});
