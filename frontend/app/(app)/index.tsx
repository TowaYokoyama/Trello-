import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  useWindowDimensions,
  Animated,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../src/api/client';
import { useAuth } from '../../src/contexts/AuthContext';
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { logout } = useAuth(); // logout関数を取得
  const flatListRef = useRef<FlatList>(null); // FlatListへの参照

  // アニメーション開始
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // --- データ取得 ---
  const fetchBoards = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<Board[]>('/api/boards/');
      setBoards(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch boards', error);
      Alert.alert('エラー', 'ボードを取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBoards(); }, []));

  // --- イベントハンドラ ---
  const handleAddBoard = async () => {
    if (newBoardTitle.trim() === '') {
      Alert.alert('エラー', 'ボードタイトルを入力してください。');
      return;
    }
    try {
      const response = await apiClient.post<Board>('/api/boards/', { 
        title: newBoardTitle,
        description: newBoardDescription || null,
      });
      const currentBoards = Array.isArray(boards) ? boards : [];
      setBoards([...currentBoards, response.data]);
      setNewBoardTitle('');
      setNewBoardDescription('');
      
      // リストの最後にスクロール
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    } catch (error) {
      console.error('Failed to add board', error);
      Alert.alert('エラー', 'ボードを追加できませんでした。');
    }
  };

  const deleteBoard = async (boardId: number) => {
    try {
      await apiClient.delete(`/api/boards/${boardId}`);
      const currentBoards = Array.isArray(boards) ? boards : [];
      setBoards(currentBoards.filter(b => b.id !== boardId));
    } catch (error) {
      console.error('Failed to delete board', error);
      Alert.alert('エラー', 'ボードを削除できませんでした。');
    }
  };

  const handleDeleteBoard = (boardId: number) => {
    const message = '本当にこのボードを削除しますか？すべてのリストとカードも削除されます。';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        deleteBoard(boardId);
      }
    } else {
      Alert.alert(
        'ボードを削除',
        message,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: () => deleteBoard(boardId),
          }
        ]
      );
    }
  };

  const handlePressBoard = (boardId: number) => {
    router.push(`/boards/${boardId}`);
  };

  // --- レスポンシブ設定 ---
  const numColumns = width > 768 ? Math.floor(width / 350) : 1;
  const isGrid = numColumns > 1;

  // --- レンダリング ---
  const renderListHeader = () => (
    <>
      {/* ヘッダー */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>📋 マイボード</Text>
        <Text style={styles.headerSubtitle}>
          プロジェクトを整理して効率的に作業しましょう
        </Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ボード作成フォーム */}
      <View style={[styles.formContainer, isGrid && styles.formContainerGrid]}>
        <Text style={styles.formTitle}>新しいボードを作成</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="ボードのタイトル..."
            placeholderTextColor="rgba(100, 255, 218, 0.6)"
            value={newBoardTitle}
            onChangeText={setNewBoardTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="説明（オプション）..."
            placeholderTextColor="rgba(100, 255, 218, 0.6)"
            value={newBoardDescription}
            onChangeText={setNewBoardDescription}
            multiline
            numberOfLines={3}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddBoard}>
          <Text style={styles.addButtonText}>ボードを作成</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#64ffda" />
          <Text style={styles.loadingText}>ボードを読み込み中...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.View 
        style={[
          styles.content,
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* ボード一覧 */}
        <FlatList
          ref={flatListRef} // 参照をセット
          ListHeaderComponent={renderListHeader}
          key={numColumns}
          data={Array.isArray(boards) ? boards : []}
          numColumns={numColumns}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View
              style={[
                styles.boardItemContainer,
                { 
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }] 
                }
              ]}
            >
              <TouchableOpacity 
                onPress={() => handlePressBoard(item.id)} 
                style={[styles.boardItem, isGrid && styles.boardItemGrid]}
                activeOpacity={0.8}
              >
                <View style={styles.boardGradientOverlay}>
                  <LinearGradient
                    colors={[
                      `rgba(100, 255, 218, ${0.1 + (index % 3) * 0.05})`,
                      `rgba(138, 43, 226, ${0.1 + (index % 3) * 0.05})`,
                      `rgba(255, 20, 147, ${0.1 + (index % 3) * 0.05})`
                    ]}
                    style={styles.boardGradient}
                  />
                </View>
                
                <View style={styles.boardContent}>
                  <View style={styles.boardTextContainer}>
                    <Text style={styles.boardTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.boardDescription} numberOfLines={3}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.boardStats}>
                    <Text style={styles.boardStatsText}>タップして開く</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  onPress={() => handleDeleteBoard(item.id)} 
                  style={styles.deleteButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          )}
          ListEmptyComponent={() => (
            <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>ボードがありません</Text>
              <Text style={styles.emptyText}>
                最初のボードを作成して{'\n'}プロジェクトを開始しましょう！
              </Text>
            </Animated.View>
          )}
        />
      </Animated.View>

      {/* 背景装飾 */}
      <View style={styles.backgroundDecoration}>
        <Animated.View style={[styles.floatingCircle, styles.circle1, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.floatingCircle, styles.circle2, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.floatingCircle, styles.circle3, { opacity: fadeAnim }]} />
      </View>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#64ffda',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },

  // ヘッダー
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#64ffda',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(100, 255, 218, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  logoutButton: {
    position: 'absolute',
    top: 0,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
  },
  logoutButtonText: {
    color: '#64ffda',
    fontWeight: 'bold',
  },

  // フォーム
  formContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
    shadowColor: '#64ffda',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  formContainerGrid: {
    width: 350,
    alignSelf: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64ffda',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(100, 255, 218, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.3)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    color: '#64ffda',
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: 'rgba(100, 255, 218, 0.2)',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.4)',
  },
  addButtonText: {
    color: '#64ffda',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // リスト
  listContentContainer: {
    padding: 20,
  },
  boardItemContainer: {
    flex: 1,
    margin: 8,
  },
  boardItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
    shadowColor: '#64ffda',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    minHeight: 120,
  },
  boardItemGrid: {
    minHeight: 180,
  },
  boardGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  boardGradient: {
    flex: 1,
  },
  boardContent: {
    flex: 1,
    zIndex: 1,
  },
  boardTextContainer: {
    flex: 1,
    marginBottom: 10,
  },
  boardTitle: {
    fontSize: 20,
    color: '#64ffda',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  boardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  boardStats: {
    alignSelf: 'flex-start',
  },
  boardStatsText: {
    fontSize: 12,
    color: 'rgba(100, 255, 218, 0.7)',
    fontWeight: '500',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  deleteButtonText: {
    color: '#ff5252',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // 空状態
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64ffda',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },

  // 背景装飾
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(100, 255, 218, 0.05)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: 100,
    left: -100,
  },
  circle2: {
    width: 250,
    height: 250,
    bottom: 200,
    right: -80,
    backgroundColor: 'rgba(138, 43, 226, 0.05)',
  },
  circle3: {
    width: 200,
    height: 200,
    top: 400,
    right: 20,
    backgroundColor: 'rgba(255, 20, 147, 0.05)',
  },
});