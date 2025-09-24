import React, { useState, useEffect } from 'react';
import { Platform, Dimensions, View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Task } from '@/types';
import CrossPlatformDateTimePicker from '@/components/common/CrossPlatformDateTimePicker';

const { height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  updateTaskProgress: (taskId: number, newProgress: number) => void;
  updateTaskDueDate: (taskId: number, newDueDate: Date | null) => void; // Add this prop
}

interface ProgressSliderProps {
  task: Task;
  updateTaskProgress: (taskId: number, newProgress: number) => void;
}

const ProgressSlider: React.FC<ProgressSliderProps> = ({ task, updateTaskProgress }) => {
  const [tempProgress, setTempProgress] = useState(task.progress);

  useEffect(() => {
    setTempProgress(task.progress);
  }, [task.progress]);

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>進捗: {tempProgress}%</Text>
      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <View
            style={[{ width: `${tempProgress}%` }, styles.sliderFill]}
          />
        </View>
        <View style={styles.progressButtons}>
          {[0, 25, 50, 75, 100].map(value => (
            <TouchableOpacity
              key={value}
              style={[
                styles.progressButton,
                tempProgress === value && styles.progressButtonActive,
              ]}
              onPress={() => {
                setTempProgress(value);
                updateTaskProgress(task.id, value);
              }}
            >
              <Text
                style={[
                  styles.progressButtonText,
                  tempProgress === value && styles.progressButtonTextActive,
                ]}
              >
                {value}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

export const TaskDetailModal: React.FC<Props> = ({ visible, onClose, task, updateTaskProgress, updateTaskDueDate }) => {
  const [showPicker, setShowPicker] = useState(false);

  if (!task) return null;

  const onDateChange = (event: any, selectedDate?: Date) => {
    // Always close the picker UI first on any action
    setShowPicker(false);
    // Ensure a date was selected and the action was to set the date
    if (event.type === 'set' && selectedDate && task) {
      updateTaskDueDate(task.id, selectedDate);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{task.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.taskDetails}>
            <View style={styles.taskDetailRow}>
              <Text style={styles.taskDetailLabel}>担当者</Text>
              <Text style={styles.taskDetailValue}>{task.assignee}</Text>
            </View>

            <View style={styles.taskDetailRow}>
              <Text style={styles.taskDetailLabel}>開始日</Text>
              <Text style={styles.taskDetailValue}>
                {task.startDate ? task.startDate.toLocaleDateString('ja-JP') : '未設定'}
              </Text>
            </View>

            <View style={styles.taskDetailRow}>
              <Text style={styles.taskDetailLabel}>終了日</Text>
              <View style={styles.dateValueContainer}>
                <Text style={styles.taskDetailValue}>
                  {task.endDate ? task.endDate.toLocaleDateString('ja-JP') : '未設定'}
                </Text>
                <TouchableOpacity style={styles.setDateButton} onPress={() => setShowPicker(true)}>
                  <Text style={styles.setDateButtonText}>{task.endDate ? '変更' : '設定'}</Text>
                </TouchableOpacity>
                {task.endDate && (
                  <TouchableOpacity style={{...styles.setDateButton, backgroundColor: '#E74C3C', marginLeft: 10}} onPress={() => updateTaskDueDate(task.id, null)}>
                    <Text style={styles.setDateButtonText}>削除</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.taskDetailRow}>
              <Text style={styles.taskDetailLabel}>ステータス</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: task.completed ? '#27AE60' : '#F39C12' },
                ]}
              >
                <Text style={styles.statusText}>
                  {task.completed ? '完了' : '進行中'}
                </Text>
              </View>
            </View>

            <ProgressSlider task={task} updateTaskProgress={updateTaskProgress} />
          </ScrollView>

          {showPicker && (
            <CrossPlatformDateTimePicker
              value={task.endDate || new Date()}
              onChange={onDateChange}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  dateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  setDateButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3498DB',
    borderRadius: 6,
  },
  setDateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
