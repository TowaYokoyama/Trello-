import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const DAY_WIDTH = 80;
const TASK_HEIGHT = 50;
const BOARD_HEADER_HEIGHT = 60;

interface Task {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  assignee: string;
  completed: boolean;
}

interface Board {
  id: number;
  name: string;
  color: string;
  collapsed: boolean;
  tasks: Task[];
}

const TrelloGanttChart = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const scrollViewRef = useRef<ScrollView>(null);

  const [boards, setBoards] = useState<Board[]>([
    {
      id: 1,
      name: 'プロジェクトA',
      color: '#FF6B6B',
      collapsed: false,
      tasks: [
        {
          id: 1,
          title: '要件定義',
          startDate: new Date(2025, 8, 23),
          endDate: new Date(2025, 8, 27),
          progress: 100,
          assignee: '田中',
          completed: true
        },
        {
          id: 2,
          title: 'デザイン作成',
          startDate: new Date(2025, 8, 26),
          endDate: new Date(2025, 9, 2),
          progress: 75,
          assignee: '佐藤',
          completed: false
        },
        {
          id: 3,
          title: 'プロトタイプ開発',
          startDate: new Date(2025, 8, 30),
          endDate: new Date(2025, 9, 8),
          progress: 30,
          assignee: '鈴木',
          completed: false
        }
      ]
    },
    {
      id: 2,
      name: 'プロジェクトB',
      color: '#4ECDC4',
      collapsed: false,
      tasks: [
        {
          id: 4,
          title: 'データ分析',
          startDate: new Date(2025, 8, 24),
          endDate: new Date(2025, 8, 28),
          progress: 90,
          assignee: '田中',
          completed: false
        },
        {
          id: 5,
          title: 'レポート作成',
          startDate: new Date(2025, 8, 28),
          endDate: new Date(2025, 9, 5),
          progress: 45,
          assignee: '山田',
          completed: false
        }
      ]
    },
    {
      id: 3,
      name: '開発チーム',
      color: '#96CEB4',
      collapsed: false,
      tasks: [
        {
          id: 6,
          title: 'バックエンド開発',
          startDate: new Date(2025, 9, 1),
          endDate: new Date(2025, 9, 15),
          progress: 20,
          assignee: '伊藤',
          completed: false
        },
        {
          id: 7,
          title: 'フロントエンド開発',
          startDate: new Date(2025, 9, 3),
          endDate: new Date(2025, 9, 12),
          progress: 10,
          assignee: '高橋',
          completed: false
        },
        {
          id: 8,
          title: 'テスト実装',
          startDate: new Date(2025, 9, 10),
          endDate: new Date(2025, 9, 20),
          progress: 0,
          assignee: '渡辺',
          completed: false
        }
      ]
    }
  ]);

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
      date.toDateString() === task.startDate.toDateString()
    );
    const endIndex = dateRange.findIndex(date => 
      date.toDateString() === task.endDate.toDateString()
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
          contentOffset={{ x: (dateRange.length * DAY_WIDTH / 2) - (width / 2), y: 0 }}
        >
          <View style={styles.dateHeader}>
            {dateRange.map((date, index) => (
              <View key={index} style={[
                styles.dateColumn,
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

  const renderTaskBar = (task: Task, boardColor: string, dateRange: Date[]) => {
    const position = calculateTaskPosition(task, dateRange);
    if (!position) return null;

    const progressWidth = (position.width * task.progress) / 100;
    
    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskBar,
          { 
            left: position.left,
            width: position.width,
            backgroundColor: `${boardColor}40`,
            borderColor: boardColor
          },
          task.completed && styles.taskBarCompleted
        ]}
        onPress={() => {
          setSelectedTask(task);
          setShowTaskModal(true);
        }}
        activeOpacity={0.8}
      >
        <View 
          style={[
            styles.taskProgress,
            { 
              width: progressWidth,
              backgroundColor: boardColor
            }
          ]}
        />
        <Text style={[
          styles.taskBarText,
          task.completed && styles.taskBarTextCompleted
        ]} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.taskInfo}>
          <Text style={styles.taskProgressText}>{task.progress}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBoard = (board: Board) => {
    const dateRange = getDateRange();
    const visibleTasks = selectedBoard === 'all' || selectedBoard === board.name 
      ? board.tasks 
      : [];

    return (
      <View key={board.id} style={styles.boardContainer}>
        {/* Board Header */}
        <TouchableOpacity
          style={[styles.boardHeader, { borderLeftColor: board.color }]}
          onPress={() => toggleBoardCollapse(board.id)}
          activeOpacity={0.7}
        >
          <View style={styles.boardHeaderContent}>
            <View style={styles.boardInfo}>
              <Text style={styles.boardName}>{board.name}</Text>
              <Text style={styles.taskCount}>{board.tasks.length}タスク</Text>
            </View>
            <View style={styles.boardControls}>
              <Text style={[
                styles.collapseIcon,
                board.collapsed && styles.collapseIconRotated
              ]}>
                ▼
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Tasks */}
        {!board.collapsed && (
          <View style={styles.tasksContainer}>
            <View style={styles.taskNameColumn}>
              {visibleTasks.map(task => (
                <View key={task.id} style={styles.taskNameContainer}>
                  <Text style={[
                    styles.taskName,
                    task.completed && styles.taskNameCompleted
                  ]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskAssignee}>{task.assignee}</Text>
                </View>
              ))}
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: (dateRange.length * DAY_WIDTH / 2) - (width / 2), y: 0 }}
            >
              <View style={styles.ganttArea}>
                {/* Date Grid Lines */}
                {dateRange.map((date, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.dateGridLine,
                      isWeekend(date) && styles.weekendGridLine,
                      isToday(date) && styles.todayGridLine
                    ]}
                  />
                ))}
                
                {/* Task Bars */}
                {visibleTasks.map(task => 
                  renderTaskBar(task, board.color, dateRange)
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderProgressSlider = (task: Task) => {
    const [tempProgress, setTempProgress] = useState(task.progress);

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>進捗: {tempProgress}%</Text>
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View 
              style={[
                styles.sliderFill,
                { width: `${tempProgress}%` }
              ]}
            />
          </View>
          <View style={styles.progressButtons}>
            {[0, 25, 50, 75, 100].map(value => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.progressButton,
                  tempProgress === value && styles.progressButtonActive
                ]}
                onPress={() => {
                  setTempProgress(value);
                  updateTaskProgress(task.id, value);
                }}
              >
                <Text style={[
                  styles.progressButtonText,
                  tempProgress === value && styles.progressButtonTextActive
                ]}>
                  {value}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowBoardModal(true)}
          >
            <Text style={styles.filterIcon}>⚙</Text>
          </TouchableOpacity>
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
        {boards.map(board => renderBoard(board))}
      </ScrollView>

      {/* Task Detail Modal */}
      <Modal
        visible={showTaskModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTask?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setShowTaskModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {selectedTask && (
              <ScrollView style={styles.taskDetails}>
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>担当者</Text>
                  <Text style={styles.taskDetailValue}>{selectedTask.assignee}</Text>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>開始日</Text>
                  <Text style={styles.taskDetailValue}>
                    {selectedTask.startDate.toLocaleDateString('ja-JP')}
                  </Text>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>終了日</Text>
                  <Text style={styles.taskDetailValue}>
                    {selectedTask.endDate.toLocaleDateString('ja-JP')}
                  </Text>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>ステータス</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: selectedTask.completed ? '#27AE60' : '#F39C12' }
                  ]}>
                    <Text style={styles.statusText}>
                      {selectedTask.completed ? '完了' : '進行中'}
                    </Text>
                  </View>
                </View>

                {renderProgressSlider(selectedTask)}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Board Filter Modal */}
      <Modal
        visible={showBoardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBoardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ボード選択</Text>
              <TouchableOpacity
                onPress={() => setShowBoardModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedBoard('all');
                setShowBoardModal(false);
              }}
            >
              <View style={[styles.radio, selectedBoard === 'all' && styles.radioSelected]}>
                {selectedBoard === 'all' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.filterOptionText}>すべてのボード</Text>
            </TouchableOpacity>

            {boards.map(board => (
              <TouchableOpacity
                key={board.id}
                style={styles.filterOption}
                onPress={() => {
                  setSelectedBoard(board.name);
                  setShowBoardModal(false);
                }}
              >
                <View style={[styles.radio, selectedBoard === board.name && styles.radioSelected]}>
                  {selectedBoard === board.name && <View style={styles.radioDot} />}
                </View>
                <View style={styles.boardOption}>
                  <View style={[styles.boardColorIndicator, { backgroundColor: board.color }]} />
                  <Text style={styles.filterOptionText}>{board.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TrelloGanttChart;

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
    width: DAY_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ECF0F1',
  },
  weekendColumn: {
    backgroundColor: '#FDF2F2',
  },
  todayColumn: {
    backgroundColor: '#E3F2FD',
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
  todayDateText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
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
    minWidth: 800,
  },
  dateGridLine: {
    width: DAY_WIDTH,
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
