import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Board, Task } from '@/types';
import apiClient from '@/api/client';
import { HeaderSettingsButton } from '@/components/common/HeaderSettingsButton';
import { BoardRow } from '@/components/gantt/BoardRow';
import { TaskDetailModal } from '@/components/gantt/TaskDetailModal';
import { BoardFilterModal } from '@/components/gantt/BoardFilterModal';
import { SettingsModal } from '@/components/common/SettingsModal';
import { AuthContext } from '@/contexts/AuthContext';


const { width, height } = Dimensions.get('window');

const TrelloGanttChart = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState<boolean>(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { token } = useContext(AuthContext);

  // Responsive DAY_WIDTH calculation
  const isMobile = width <= 768;
  const DAY_WIDTH = isMobile 
    ? 80 // On mobile, use a fixed width for better readability and allow scrolling
    : (viewMode === 'week' ? (width - 200) / 7 : (width - 200) / 15); // On desktop, fit to screen

  useEffect(() => {
    const fetchBoards = async () => {
      if (!token) {
        setLoading(false);
        return; // Do not fetch if no token
      }
      try {
        setLoading(true);
        const response = await apiClient.get('/api/boards/');
        const data = response.data as any[]; // Replace 'any' with a proper backend schema type if available

        const transformedBoards: Board[] = data.map(board => {
          const tasks: Task[] = board.lists.flatMap((list: any) => 
            list.cards.map((card: any) => {
              const endDate = card.due_date ? new Date(card.due_date) : null;
              const startDate = card.start_date ? new Date(card.start_date) : endDate; // Use start_date from API, fallback to endDate
              
              return {
                id: card.id,
                title: card.title,
                startDate: startDate,
                endDate: endDate,
                progress: card.completed ? 100 : 0, // Placeholder for progress
                assignee: '', // Placeholder for assignee
                completed: card.completed,
              };
            })
          );

          return {
            id: board.id,
            name: board.title,
            color: board.color || '#8E44AD', // Use color from API, fallback to a default
            collapsed: false,
            tasks: tasks,
          };
        });

        setBoards(transformedBoards);
      } catch (err) {
        Alert.alert('エラー', 'ボードデータの取得に失敗しました。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [token]);

  if (loading) {
    return <View style={styles.container}><Text>読み込み中...</Text></View>;
  }

  const getDateRange = (): Date[] => {
    const start = new Date(currentDate);
    const days = viewMode === 'week' ? 14 : 30;
    start.setDate(start.getDate() - Math.floor(days / 2));
    
    const dateRange: Date[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dateRange.push(date);
    }
    return dateRange;
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDate = (date: Date): string => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDayOfWeek = (date: Date): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };

  const calculateTaskPosition = (task: Task, dateRange: Date[]): { left: number; width: number } | null => {
    const startIndex = dateRange.findIndex(date => 
      task.startDate && date.toDateString() === task.startDate.toDateString()
    );
    const endIndex = dateRange.findIndex(date => 
      task.endDate && date.toDateString() === task.endDate.toDateString()
    );

    if (startIndex === -1 && endIndex === -1) return null;

    const actualStart = Math.max(0, startIndex);
    const actualEnd = endIndex === -1 ? dateRange.length - 1 : Math.min(dateRange.length - 1, endIndex);
    
    const left = actualStart * DAY_WIDTH;
    const width = (actualEnd - actualStart + 1) * DAY_WIDTH;

    return { left, width };
  };

  const toggleBoardCollapse = (boardId: number) => {
    setBoards(boards.map(board => 
      board.id === boardId 
        ? { ...board, collapsed: !board.collapsed }
        : board
    ));
  };

  const updateTaskProgress = (taskId: number, newProgress: number) => {
    setBoards(boards.map(board => ({
      ...board,
      tasks: board.tasks.map(task => 
        task.id === taskId 
          ? { ...task, progress: newProgress, completed: newProgress === 100 }
          : task
      )
    })));
  };

  const updateTaskDueDate = async (taskId: number, newDueDate: Date | null) => {
    try {
      const response = await apiClient.put(`/api/cards/${taskId}`, { 
        due_date: newDueDate ? newDueDate.toISOString() : null
      });
      const updatedCard = response.data;

      // Update the boards state
      const newBoards = boards.map(board => ({
        ...board,
        tasks: board.tasks.map(task => {
          if (task.id === taskId) {
            const updatedTask = {
              ...task,
              endDate: updatedCard.due_date ? new Date(updatedCard.due_date) : null,
            };
            // Also update the selected task if it's the one being edited
            if (selectedTask && selectedTask.id === taskId) {
              setSelectedTask(updatedTask);
            }
            return updatedTask;
          }
          return task;
        }),
      }));
      setBoards(newBoards);

    } catch (error) {
      console.error('Failed to update due date', error);
      Alert.alert('エラー', '期限日の更新に失敗しました。');
    }
  };

  const navigateTime = (direction: number) => {
    const newDate = new Date(currentDate);
    const days = viewMode === 'week' ? 7 : 30;
    newDate.setDate(currentDate.getDate() + (direction * days));
    setCurrentDate(newDate);
  };

  const renderDateHeader = () => {
    const dateRange = getDateRange();
    
    return (
      <View style={styles.dateHeaderContainer}>
        <View style={styles.boardNameHeader} />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          ref={scrollViewRef}
          contentOffset={isMobile ? { x: 0, y: 0 } : { x: (dateRange.length * DAY_WIDTH / 2) - ((width - 200) / 2), y: 0 }}
        >
          <View style={styles.dateHeader}>
            {dateRange.map((date, index) => (
              <View key={index} style={[
                styles.dateColumn, { width: DAY_WIDTH },
                isWeekend(date) && styles.weekendColumn,
                isToday(date) && styles.todayColumn
              ]}>
                <Text style={[
                  styles.dateText,
                  isToday(date) && styles.todayDateText
                ]}>
                  {formatDate(date)}
                </Text>
                <Text style={[
                  styles.dayText,
                  isWeekend(date) && styles.weekendText,
                  isToday(date) && styles.todayDayText
                ]}>
                  {getDayOfWeek(date)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ガントチャート</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[
              styles.viewModeButtonText,
              viewMode === 'week' && styles.viewModeButtonTextActive
            ]}>週</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[
              styles.viewModeButtonText,
              viewMode === 'month' && styles.viewModeButtonTextActive
            ]}>月</Text>
          </TouchableOpacity>
          <HeaderSettingsButton onPress={() => setShowSettingsModal(true)} />
        </View>
      </View>

      {/* Time Navigation */}
      <View style={styles.timeNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateTime(-1)}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <Text style={styles.timeText}>
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </Text>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateTime(1)}
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Date Header */}
      {renderDateHeader()}

      {/* Gantt Chart */}
      <ScrollView style={styles.ganttContainer} showsVerticalScrollIndicator={false}>
        {boards.map(board => (
          <BoardRow 
            key={board.id}
            board={board}
            dateRange={getDateRange()}
            DAY_WIDTH={DAY_WIDTH}
            isMobile={isMobile}
            selectedBoard={selectedBoard}
            toggleBoardCollapse={toggleBoardCollapse}
            onTaskPress={(task) => {
              setSelectedTask(task);
              setShowTaskModal(true);
            }}
          />
        ))}
      </ScrollView>

      <TaskDetailModal 
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        task={selectedTask}
        updateTaskProgress={updateTaskProgress}
        updateTaskDueDate={updateTaskDueDate}
      />

      <BoardFilterModal
        visible={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        boards={boards}
        selectedBoard={selectedBoard}
        onSelectBoard={(boardName) => {
          setSelectedBoard(boardName);
          setShowBoardModal(false);
        }}
      />

      <SettingsModal visible={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
        
    </SafeAreaView>
  );
};

export default TrelloGanttChart;

// Define constants for heights used in styles
const BOARD_HEADER_HEIGHT = 48;
const TASK_HEIGHT = 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#2C3E50',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'white',
  },
  viewModeButtonActive: {
    backgroundColor: 'white',
  },
  viewModeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  viewModeButtonTextActive: {
    color: '#2C3E50',
  },
  filterButton: {
    padding: 8,
  },
  filterIcon: {
    color: 'white',
    fontSize: 18,
  },
  timeNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
    elevation: 1,
  },
  boardNameHeader: {
    width: 200,
    height: 60,
    backgroundColor: '#F8F9FA',
    borderRightWidth: 1,
    borderRightColor: '#ECF0F1',
  },
  dateHeader: {
    flexDirection: 'row',
    height: 60,
  },
  dateColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ECF0F1',
  },
  weekendColumn: {
    backgroundColor: '#FDF2F2',
  },
  todayColumn: {
    borderRightColor: '#64ffda',
    borderRightWidth: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  dayText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  weekendText: {
    color: '#E74C3C',
  },
  todayDateText: {},
  todayDayText: {},
  ganttContainer: {
    flex: 1,
  },
  boardContainer: {
    backgroundColor: 'white',
    marginBottom: 1,
  },
  boardHeader: {
    height: BOARD_HEADER_HEIGHT,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
  },
  boardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardInfo: {
    flex: 1,
  },
  boardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  taskCount: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  boardControls: {
    padding: 8,
  },
  collapseIcon: {
    fontSize: 12,
    color: '#7F8C8D',
    transform: [{ rotate: '0deg' }],
  },
  collapseIconRotated: {
    transform: [{ rotate: '-90deg' }],
  },
  tasksContainer: {
    flexDirection: 'row',
  },
  taskNameColumn: {
    width: 200,
    backgroundColor: '#FAFBFC',
    borderRightWidth: 1,
    borderRightColor: '#ECF0F1',
  },
  taskNameContainer: {
    height: TASK_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    lineHeight: 18,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#95A5A6',
  },
  taskAssignee: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  ganttArea: {
    flexDirection: 'row',
    position: 'relative',
  },
  dateGridLine: {
    borderRightWidth: 1,
    borderRightColor: '#ECF0F1',
    backgroundColor: 'white',
  },
  weekendGridLine: {
    backgroundColor: '#FDF2F2',
  },
  todayGridLine: {
    backgroundColor: '#E3F2FD',
    borderRightColor: '#2196F3',
  },
  taskBar: {
    position: 'absolute',
    height: TASK_HEIGHT - 10,
    marginTop: 5,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  taskBarCompleted: {
    opacity: 0.7,
  },
  taskProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  taskBarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    zIndex: 1,
  },
  taskBarTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#95A5A6',
  },
  taskInfo: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  taskProgressText: {
    fontSize: 10,
    color: '#2C3E50',
    fontWeight: 'bold',
    backgroundColor: 'white',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    minHeight: height * 0.4,
  },
  filterModalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: height * 0.2,
    borderRadius: 12,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECF0F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#7F8C8D',
    fontWeight: 'bold',
  },
  taskDetails: {
    flex: 1,
    padding: 20,
  },
  taskDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  taskDetailLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  taskDetailValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 20,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#ECF0F1',
    borderRadius: 4,
    marginBottom: 12,
  },
  sliderFill: {
    height: 8,
    backgroundColor: '#3498DB',
    borderRadius: 4,
  },
  progressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#ECF0F1',
    borderWidth: 1,
    borderColor: '#BDC3C7',
  },
  progressButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  progressButtonText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '600',
  },
  progressButtonTextActive: {
    color: 'white',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#BDC3C7',
    borderRadius: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#3498DB',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3498DB',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  boardOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
});
function setLoading(arg0: boolean) {
  throw new Error('Function not implemented.');
}

