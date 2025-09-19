import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
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
      const boardResponse = await apiClient.get<Board>(`/boards/${boardId}`);
      setBoard(boardResponse.data);

      const listsResponse = await apiClient.get<List[]>(`/boards/${boardId}/lists/`);
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
      const response = await apiClient.post<List>(`/boards/${boardId}/lists/`, { title: newListName });
      setLists([...lists, response.data]);
      setNewListName('');
    } catch (error) {
      console.error('Failed to add list', error);
      Alert.alert('Error', 'Could not add list.');
    }
  };

  const handleDeleteList = async (listId: number) => {
    try {
      await apiClient.delete(`/lists/${listId}`);
      setLists(lists.filter(l => l.id !== listId));
    } catch (error) {
      console.error('Failed to delete list', error);
      Alert.alert('Error', 'Could not delete list.');
    }
  };

  // --- カード関連イベントハンドラ ---
  const handleAddCard = async (listId: number, cardTitle: string) => {
    if (cardTitle.trim() === '') return;
    try {
      const response = await apiClient.post<Card>(`/lists/${listId}/cards/`, { title: cardTitle });
      setLists(lists.map(list => 
        list.id === listId ? { ...list, cards: [...list.cards, response.data] } : list
      ));
    } catch (error) {
      console.error('Failed to add card', error);
      Alert.alert('Error', 'Could not add card.');
    }
  };

  const handleDeleteCard = async (listId: number, cardId: number) => {
    try {
      await apiClient.delete(`/cards/${cardId}`);
      setLists(lists.map(list => 
        list.id === listId ? { ...list, cards: list.cards.filter(card => card.id !== cardId) } : list
      ));
    } catch (error) {
      console.error('Failed to delete card', error);
      Alert.alert('Error', 'Could not delete card.');
    }
  };

  const handleToggleCardComplete = async (listId: number, card: Card) => {
    try {
      const updatedCard = { ...card, completed: !card.completed };
      await apiClient.put(`/cards/${card.id}`, { completed: updatedCard.completed });
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
    <View style={styles.container}>
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
        renderItem={({ item: list }) => (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{list.title}</Text>
              <TouchableOpacity onPress={() => handleDeleteList(list.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete List</Text>
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
                  <TouchableOpacity onPress={() => handleDeleteCard(list.id, card.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />

            <View style={styles.addCardContainer}>
              <TextInput
                style={styles.input}
                placeholder="New card title..."
                onSubmitEditing={({ nativeEvent: { text } }) => handleAddCard(list.id, text)}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 10 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#ef4444' },
  boardTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#1e293b' },
  boardDescription: { fontSize: 16, color: '#64748b', marginBottom: 20 },

  addListContainer: { flexDirection: 'row', marginBottom: 20 },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 8, 
    padding: 10, 
    marginRight: 10, 
    backgroundColor: '#fff' 
  },
  addButton: { 
    backgroundColor: '#3b82f6', 
    borderRadius: 8, 
    padding: 10, 
    justifyContent: 'center' 
  },
  addButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },

  listContainer: {
    width: 300, // リストの幅を固定
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    height: '90%', // ボードの高さに合わせて調整
  },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },

  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardText: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1e293b' },
  cardTextCompleted: { color: '#64748b', textDecorationLine: 'line-through' },
  checkboxBase: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#94a3b8' },
  checkboxChecked: { backgroundColor: '#22c55e', borderColor: '#22c55e' },

  addCardContainer: { marginTop: 10 },
  deleteButton: { padding: 5 },
  deleteButtonText: { color: '#ef4444', fontSize: 12 },
});
