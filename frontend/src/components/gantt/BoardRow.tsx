import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Board, Task } from '@/types';

const TASK_HEIGHT = 50;

interface Props {
  board: Board;
  dateRange: Date[];
  DAY_WIDTH: number;
  isMobile: boolean;
  selectedBoard: string;
  onTaskPress: (task: Task) => void;
  toggleBoardCollapse: (boardId: number) => void;
}

const renderTaskBar = (task: Task, boardColor: string, dateRange: Date[], DAY_WIDTH: number, onTaskPress: (task: Task) => void, index: number) => {
  const calculateTaskPosition = (task: Task, dateRange: Date[]): { left: number; width: number } | null => {
    const { startDate, endDate } = task;
    if (!startDate || !endDate) return null;

    const startIndex = dateRange.findIndex(date => 
      date.toDateString() === startDate.toDateString()
    );
    const endIndex = dateRange.findIndex(date => 
      date.toDateString() === endDate.toDateString()
    );

    if (startIndex === -1 && endIndex === -1) return null;

    const actualStart = Math.max(0, startIndex);
    const actualEnd = endIndex === -1 ? dateRange.length - 1 : Math.min(dateRange.length - 1, endIndex);
    
    const left = actualStart * DAY_WIDTH;
    const width = (actualEnd - actualStart + 1) * DAY_WIDTH;

    return { left, width };
  };

  const position = calculateTaskPosition(task, dateRange);
  if (!position) return null;

  const top = index * TASK_HEIGHT;

  return (
    <TouchableOpacity
      key={task.id}
      style={[
        styles.taskBar,
        { 
          top,
          left: position.left,
          width: position.width,
          backgroundColor: boardColor,
          borderColor: `${boardColor}80`
        },
        task.completed && styles.taskBarCompleted
      ]}
      onPress={() => onTaskPress(task)}
      activeOpacity={0.8}
    >
      {task.completed && <Text style={styles.checkmark}>✔</Text>}
    </TouchableOpacity>
  );
};

export const BoardRow: React.FC<Props> = ({ board, dateRange, DAY_WIDTH, isMobile, selectedBoard, onTaskPress, toggleBoardCollapse }) => {
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
            contentOffset={isMobile ? { x: 0, y: 0 } : { x: (dateRange.length * DAY_WIDTH / 2) - ((Dimensions.get('window').width - 200) / 2), y: 0 }}
          >
            <View style={[styles.ganttArea, { minWidth: dateRange.length * DAY_WIDTH }]}>
              {/* Date Grid Lines */}
              {dateRange.map((date, index) => (
                <View 
                  key={index}
                  style={[
                    styles.dateGridLine, { width: DAY_WIDTH },
                    (date.getDay() === 0 || date.getDay() === 6) ? styles.weekendGridLine : null,
                    new Date().toDateString() === date.toDateString() ? styles.todayGridLine : null
                  ]}
                />
              ))}
              
              {/* Task Bars */}
              {visibleTasks.map((task, index) => {
                const taskBar = renderTaskBar(task, board.color, dateRange, DAY_WIDTH, onTaskPress, index);
                // If taskBar is null (no start/end date), render a placeholder to keep row alignment
                return taskBar ? taskBar : <View key={task.id} style={{ height: TASK_HEIGHT }} />;
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  boardContainer: {
    backgroundColor: 'white',
    marginBottom: 1,
  },
  boardHeader: {
    height: 60, // BOARD_HEADER_HEIGHT
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
    borderRightColor: '#64ffda',
    borderRightWidth: 2,
  },
  taskBar: {
    position: 'absolute',
    height: TASK_HEIGHT - 10,
    marginTop: 5,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  taskBarTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#95A5A6',
  },
  checkmark: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
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
});
