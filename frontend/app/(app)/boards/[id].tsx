import React, { useState, useEffect, useCallback } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
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

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams();
  const boardId = typeof id === 'string' ? parseInt(id) : undefined;
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- データ取得 ---
  const fetchBoardDetails = async () => {
    if (!boardId) return;
    try {
      setIsLoading(true);
      const boardResponse = await apiClient.get<Board>(`/api/boards/${boardId}`);
      setBoard(boardResponse.data);

      const listsResponse = await apiClient.get<List[]>(`/api/boards/${boardId}/lists/`);
      setLists(listsResponse.data);
    } catch (error) {
      console.error('Failed to fetch board details', error);
      Alert.alert('Error', 'Could not fetch board details.');
      router.back(); // エラー時は前の画面に戻る
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBoardDetails(); }, [boardId]));

  // --- リスト関連イベントハンドラ ---
  const handleAddList = async () => {
    if (!boardId || newListName.trim() === '') return;
    try {
      const response = await apiClient.post<List>(`/api/boards/${boardId}/lists/`, { title: newListName });
      setLists([...lists, { ...response.data, cards: [] }]);
      setNewListName('');
    } catch (error) {
      console.error('Failed to add list', error);
      Alert.alert('Error', 'Could not add list.');
    }
  };

  const deleteList = async (listId: number) => {
    try {
      await apiClient.delete(`/api/lists/${listId}`);
      setLists(lists.filter(l => l.id !== listId));
    } catch (error) {
      console.error('Failed to delete list', error);
      Alert.alert('Error', 'Could not delete list.');
    }
  };

  const handleDeleteList = (listId: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this list?')) {
        deleteList(listId);
      }
    } else {
      Alert.alert(
        'Delete List',
        'Are you sure you want to delete this list?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteList(listId) },
        ]
      );
    }
  };

  // --- カード関連イベントハンドラ ---
  const handleAddCard = async (listId: number, cardTitle: string) => {
    if (cardTitle.trim() === '') return;
    try {
      const response = await apiClient.post<Card>(`/api/lists/${listId}/cards/`, { title: cardTitle });
      setLists(lists.map(list => 
        list.id === listId ? { ...list, cards: [...list.cards, response.data] } : list
      ));
    } catch (error) {
      console.error('Failed to add card', error);
      Alert.alert('Error', 'Could not add card.');
    }
  };

  const deleteCard = async (listId: number, cardId: number) => {
    try {
      await apiClient.delete(`/api/cards/${cardId}`);
      setLists(lists.map(list => 
        list.id === listId ? { ...list, cards: list.cards.filter(card => card.id !== cardId) } : list
      ));
    } catch (error) {
      console.error('Failed to delete card', error);
      Alert.alert('Error', 'Could not delete card.');
    }
  };

  const handleDeleteCard = (listId: number, cardId: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this card?')) {
        deleteCard(listId, cardId);
      }
    } else {
      Alert.alert(
        'Delete Card',
        'Are you sure you want to delete this card?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteCard(listId, cardId) },
        ]
      );
    }
  };

  const handleToggleCardComplete = async (listId: number, card: Card) => {
    try {
      const updatedCard = { ...card, completed: !card.completed };
      await apiClient.put(`/api/cards/${card.id}`, { completed: updatedCard.completed });
      setLists(lists.map(list => 
        list.id === listId ? 
          { ...list, cards: list.cards.map(c => (c.id === card.id ? updatedCard : c)) } : 
          list
      ));
    } catch (error) {
      console.error('Failed to update card', error);
      Alert.alert('Error', 'Could not update card.');
    }
  };

  // --- レンダリング ---
  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  if (!board) {
    return <Text style={styles.errorText}>Board not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.boardTitle}>{board.title}</Text>
      {board.description && <Text style={styles.boardDescription}>{board.description}</Text>}

      <View style={styles.addListContainer}>
        <TextInput
          style={styles.input}
          placeholder="New list title..."
          value={newListName}
          onChangeText={setNewListName}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddList}>
          <Text style={styles.addButtonText}>Add List</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }} // Give some space at the bottom
        renderItem={({ item: list }) => (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{list.title}</Text>
              <TouchableOpacity onPress={() => handleDeleteList(list.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={list.cards}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: card }) => (
                <TouchableOpacity onPress={() => handleToggleCardComplete(list.id, card)} style={styles.cardItem}>
                  <View style={[styles.checkboxBase, card.completed && styles.checkboxChecked]} />
                  <Text style={[styles.cardText, card.completed && styles.cardTextCompleted]}>
                    {card.title}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteCard(list.id, card.id)} style={styles.deleteCardButton}>
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />

            <View style={styles.addCardContainer}>
              <TextInput
                style={styles.input}
                placeholder="New card..."
                onSubmitEditing={({ nativeEvent: { text }, target }) => {
                  handleAddCard(list.id, text);
                  // Clear input after submission, requires a bit more state management or using a ref
                }}
              />
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 10 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#ef4444' },
  boardTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, color: '#1e293b', paddingHorizontal: 10 },
  boardDescription: { fontSize: 16, color: '#64748b', marginBottom: 20, paddingHorizontal: 10 },

  addListContainer: { flexDirection: 'row', marginBottom: 20, paddingHorizontal: 10 },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 8, 
    padding: 10, 
    backgroundColor: '#fff' 
  },
  addButton: { 
    backgroundColor: '#3b82f6', 
    borderRadius: 8, 
    padding: 10, 
    justifyContent: 'center',
    marginLeft: 10,
  },
  addButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },

  listContainer: {
    width: 320, // リストの幅を固定
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 5,
    height: 'auto', // Let height be determined by content
  },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },

  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardText: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1e293b' },
  cardTextCompleted: { color: '#64748b', textDecorationLine: 'line-through' },
  checkboxBase: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#94a3b8' },
  checkboxChecked: { backgroundColor: '#22c55e', borderColor: '#22c55e' },

  addCardContainer: { marginTop: 10 },
  deleteButton: { padding: 5 },
  deleteCardButton: { padding: 5 },
  deleteButtonText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 16 },
});