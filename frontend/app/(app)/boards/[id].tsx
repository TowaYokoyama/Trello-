import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../../src/api/client';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import BoardComponent from '../../../src/components/board/Board';
import DateTimePicker from '@react-native-community/datetimepicker';
import SimpleWebDatePicker from '@/components/common/SimpleWebDatePicker.web';



// --- Type Definitions ---
interface BoardType {
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
  due_date: string | null;
}

interface AddListFormProps {
  handleAddList: (listName: string) => void;
}

const AddListForm = ({ handleAddList }: AddListFormProps) => {
  const [newListName, setNewListName] = useState('');

  const handleSubmit = () => {
    if (newListName.trim()) {
      handleAddList(newListName);
      setNewListName('');
    }
  };

  return (
    <View style={styles.addListContainer}>
      <View style={styles.addListInputContainer}>
        <TextInput
          style={styles.addListInput}
          placeholder="新しいリストを追加..."
          value={newListName}
          onChangeText={setNewListName}
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity style={styles.addListButton} onPress={handleSubmit}>
          <Text style={styles.addListButtonText}>➕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams();
  const boardId = typeof id === 'string' ? parseInt(id) : undefined;
  const router = useRouter();

  const [board, setBoard] = useState<BoardType | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // For card editing modal
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedDueDate, setEditedDueDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

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
      const boardResponse = await apiClient.get<BoardType>(`/api/boards/${boardId}`);
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

  const handleAddList = async (listName: string) => {
    if (!boardId || listName.trim() === '') return;
    try {
      const response = await apiClient.post<List>(`/api/boards/${boardId}/lists/`, { title: listName });
      setLists(prev => [...prev, { ...response.data, cards: response.data.cards || [] }]);
    } catch (error) {
      console.error('Failed to add list', error);
      if (Platform.OS === 'web') {
        alert('エラー: リストを追加できませんでした。');
      } else {
        Alert.alert('エラー', 'リストを追加できませんでした。');
      }
    }
  };

  const handleDeleteList = (listId: number) => {
    const deleteAction = async () => {
      try {
        await apiClient.delete(`/api/lists/${listId}`);
        setLists(prev => prev.filter(l => l.id !== listId));
      } catch (error) {
        console.error('Failed to delete list', error);
        if (Platform.OS === 'web') {
          alert('エラー: リストを削除できませんでした。');
        } else {
          Alert.alert('エラー', 'リストを削除できませんでした。');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('本当にこのリストを削除しますか？')) {
        deleteAction();
      }
    } else {
      Alert.alert('リストを削除', '本当にこのリストを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: deleteAction },
      ]);
    }
  };

  const handleAddCard = async (listId: number, cardTitle: string) => {
    if (cardTitle.trim() === '') return;
    try {
      const response = await apiClient.post<Card>(`/api/lists/${listId}/cards/`, { title: cardTitle });
      setLists(prev => prev.map(l => l.id === listId ? { ...l, cards: [...l.cards, response.data] } : l));
    } catch (error) {
      console.error('Failed to add card', error);
      if (Platform.OS === 'web') {
        alert('エラー: カードを追加できませんでした。');
      } else {
        Alert.alert('エラー', 'カードを追加できませんでした。');
      }
    }
  };

  const getListEmoji = (index: number) => {
    const emojis = ['📋', '🔄', '✅', '🎯', '📊', '🚀', '💡', '⚡', '🌟', '🔥'];
    return emojis[index % emojis.length];
  };

  const handleCardPress = (card: Card) => {
    setSelectedCard(card);
    setEditedTitle(card.title);
    setEditedDescription(card.description || '');
    const initialDueDate = card.due_date ? new Date(card.due_date) : null;
    setEditedDueDate(initialDueDate);
    setEditModalVisible(true);
  };

  const handleUpdateCard = async () => {
    if (!selectedCard) return;

    const updatedData = {
      title: editedTitle,
      description: editedDescription,
      due_date: editedDueDate || null,
    };

    try {
      const response = await apiClient.put<Card>(`/api/cards/${selectedCard.id}`, updatedData);
      const updatedCard = response.data;

      setLists(prevLists =>
        prevLists.map(list =>
          list.id === selectedCard.list_id
            ? { ...list, cards: list.cards.map(c => c.id === selectedCard.id ? updatedCard : c) }
            : list
        )
      );
      setEditModalVisible(false);
      setSelectedCard(null);
    } catch (error) {
      console.error('Failed to update card', error);
      if (Platform.OS === 'web') {
        alert('エラー: カードを更新できませんでした。');
      } else {
        Alert.alert('エラー', 'カードを更新できませんでした。');
      }
    }
  };

  const handleToggleCardComplete = async (listId: number, card: Card) => {
    try {
      const updatedCard = { ...card, completed: !card.completed };
      await apiClient.put(`/api/cards/${card.id}`, { completed: updatedCard.completed });

      setLists(prevLists =>
        prevLists.map(list =>
          list.id === listId
            ? { ...list, cards: list.cards.map(c => (c.id === card.id ? updatedCard : c)) }
            : list
        )
      );
    } catch (err) {
      console.error("Update card error:", err);
      if (Platform.OS === 'web') {
        alert("エラー: カードの状態を更新できませんでした。");
      } else {
        Alert.alert("エラー", "カードの状態を更新できませんでした。");
      }
    }
  };

  const handleDeleteCard = async (listId: number, cardId: number) => {
    try {
      await apiClient.delete(`/api/cards/${cardId}`);
      setLists(prevLists =>
        prevLists.map(list =>
          list.id === listId
            ? { ...list, cards: list.cards.filter(card => card.id !== cardId) }
            : list
        )
      );
    } catch (error) {
      console.error('Failed to delete card', error);
      if (Platform.OS === 'web') {
        alert('エラー: カードを削除できませんでした。');
      } else {
        Alert.alert('エラー', 'カードを削除できませんでした。');
      }
    }
  };

  const handleUpdateListTitle = async (listId: number, newTitle: string) => {
    try {
      await apiClient.put(`/api/lists/${listId}`, { title: newTitle });
      setLists(prevLists =>
        prevLists.map(list =>
          list.id === listId ? { ...list, title: newTitle } : list
        )
      );
    } catch (error) {
      console.error('Failed to update list title', error);
      if (Platform.OS === 'web') {
        alert('エラー: リスト名の更新に失敗しました。');
      } else {
        Alert.alert('エラー', 'リスト名の更新に失敗しました。');
      }
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setDatePickerVisible(false);
    if (selectedDate) {
      setEditedDueDate(selectedDate);
    }
  };

  const showDatePicker = (mode: 'date' | 'time') => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  };

  const clearDueDate = () => {
    setEditedDueDate(null);
  };

  if (isLoading && !board) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#64ffda" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </LinearGradient>
    );
  }

  function formatDateForInput(date: Date): React.ReactNode {
    // Format as YYYY/MM/DD (or with time if needed)
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    // Show time only if not midnight
    const showTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    return `${year}/${month}/${day}${showTime ? ` ${hours}:${minutes}` : ''}`;
  }


  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {selectedCard && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isEditModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>カードを編集</Text>
              <TextInput
                style={styles.modalInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholder="カードのタイトル"
              />
              <TextInput
                style={[styles.modalInput, styles.modalInputDescription]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="説明"
                multiline
              />
              <TouchableOpacity onPress={() => showDatePicker('date')} style={styles.modalInput}>
                <Text style={editedDueDate ? styles.modalInputText : styles.modalInputPlaceholder}>
                  {editedDueDate ? formatDateForInput(editedDueDate) : "期限日を設定"}
                </Text>
              </TouchableOpacity>
              {editedDueDate && (
                <TouchableOpacity onPress={clearDueDate} style={styles.clearDueDateButton}>
                  <Text style={styles.clearDueDateButtonText}>期限日をクリア</Text>
                </TouchableOpacity>
              )}
              {isDatePickerVisible &&
                (Platform.OS === 'web' ? (
                  <SimpleWebDatePicker
                    value={editedDueDate}
                    onChange={setEditedDueDate}
                    onClose={() => setDatePickerVisible(false)}
                  />
                ) : (
                  <DateTimePicker
                    value={editedDueDate || new Date()}
                    mode={datePickerMode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                  />
                ))}

              <TouchableOpacity style={styles.modalButton} onPress={handleUpdateCard}>
                <Text style={styles.modalButtonText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalButtonText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <Text style={styles.boardTitle}>{board?.title}</Text>
            {board?.description && <Text style={styles.boardDescription}>{board.description}</Text>}
          </View>

          <TouchableOpacity 
          style={styles.calendarButton}
          onPress={()=> router.push('/calendar')}
          >
            <Text>カレンダーを見る</Text>
          </TouchableOpacity>

          <AddListForm handleAddList={handleAddList} />

          <BoardComponent 
            lists={lists} 
            onCardPress={handleCardPress}
            getListEmoji={getListEmoji}
            handleDeleteList={handleDeleteList}
            handleAddCard={handleAddCard}
            handleToggleCardComplete={handleToggleCardComplete}
            handleDeleteCard={handleDeleteCard}
            handleUpdateListTitle={handleUpdateListTitle}
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
  calendarButton: {
    backgroundColor: 'rgba(100, 255, 218, 0.15)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  boardTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#64ffda',
    textAlign: 'center',
    marginBottom: 8,
    ...Platform.select({
      web: {
        textShadow: '0px 2px 10px rgba(100, 255, 218, 0.3)',
      },
      native: {
        textShadowColor: 'rgba(100, 255, 218, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
      }
    })
  },
  boardDescription: { fontSize: 18, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 26, paddingHorizontal: 20 },
  addListContainer: { marginBottom: 30, alignItems: 'center' },
  addListInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 5,
    width: '95%',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(100, 255, 218, 0.3)',
      },
      native: {
        shadowColor: '#64ffda',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
      }
    })
  },
  addListInput: { flex: 1, color: '#64ffda', fontSize: 16, paddingVertical: 15, fontWeight: '500' },
  addListButton: { backgroundColor: 'rgba(100, 255, 218, 0.2)', borderRadius: 20, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  addListButtonText: { fontSize: 22 },
  backgroundDecoration: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
  floatingCircle: { position: 'absolute', borderRadius: 200, backgroundColor: 'rgba(100, 255, 218, 0.1)' },
  circle1: { width: 300, height: 300, top: 100, left: -100 },
  circle2: { width: 200, height: 200, bottom: 200, right: -50, backgroundColor: 'rgba(138, 43, 226, 0.1)' },
  circle3: { width: 150, height: 150, top: 300, right: 50, backgroundColor: 'rgba(255, 20, 147, 0.1)' },
  // Modal Styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    width: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }
    })
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#64ffda', marginBottom: 25 },
  modalButton: { backgroundColor: 'rgba(100, 255, 218, 0.2)', borderRadius: 10, padding: 15, width: '100%', marginBottom: 10 },
  modalButtonText: { color: '#64ffda', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  modalCancelButton: { backgroundColor: 'rgba(255, 82, 82, 0.2)',
  marginTop: 10 },
  modalInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  modalInputDescription: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalInputText: {
    color: '#fff',
    fontSize: 16,
  },
  modalInputPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  clearDueDateButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  clearDueDateButtonText: {
    color: '#ff5252',
    fontSize: 14,
    fontWeight: 'bold',
  },
});