import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import apiClient from '../../src/api/client';
import { useFocusEffect, useRouter } from 'expo-router';

// --- 型定義 ---
interface Board {
  id: number;
  title: string;
  description: string | null;
  owner_id: number;
}

export default function BoardsScreen() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- データ取得 ---
  const fetchBoards = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<Board[]>('/users/me/boards/');
      setBoards(response.data);
    } catch (error) {
      console.error('Failed to fetch boards', error);
      Alert.alert('Error', 'Could not fetch boards.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBoards(); }, []));

  // --- イベントハンドラ ---
  const handleAddBoard = async () => {
    if (newBoardTitle.trim() === '') return;
    try {
      const response = await apiClient.post<Board>('/users/me/boards/', { 
        title: newBoardTitle,
        description: newBoardDescription || null,
      });
      setBoards([...boards, response.data]);
      setNewBoardTitle('');
      setNewBoardDescription('');
    } catch (error) {
      console.error('Failed to add board', error);
      Alert.alert('Error', 'Could not add board.');
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    try {
      await apiClient.delete(`/boards/${boardId}`);
      setBoards(boards.filter(b => b.id !== boardId));
    } catch (error) {
      console.error('Failed to delete board', error);
      Alert.alert('Error', 'Could not delete board.');
    }
  };

  const handlePressBoard = (boardId: number) => {
    router.push(`/boards/${boardId}`); // ボード詳細画面への遷移
  };

  // --- レンダリング ---
  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="New board title..."
          value={newBoardTitle}
          onChangeText={setNewBoardTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Board description (optional)..."
          value={newBoardDescription}
          onChangeText={setNewBoardDescription}
          multiline
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddBoard}>
          <Text style={styles.addButtonText}>Add Board</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={boards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handlePressBoard(item.id)} style={styles.boardItem}>
            <View style={styles.boardTextContainer}>
              <Text style={styles.boardTitle}>{item.title}</Text>
              {item.description && <Text style={styles.boardDescription}>{item.description}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleDeleteBoard(item.id)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  formContainer: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 8 },
  addButton: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 12 },
  addButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  boardItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  boardTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  boardTitle: { marginLeft: 0, fontSize: 18, color: '#1e293b', fontWeight: 'bold' },
  boardDescription: { marginLeft: 0, fontSize: 14, color: '#64748b', marginTop: 4 },
  deleteButton: { padding: 8 },
  deleteButtonText: { color: '#ef4444' },
});