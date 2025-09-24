import { Board } from '@/types';
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';


const { height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  boards: Board[];
  selectedBoard: string;
  onSelectBoard: (boardName: string) => void;
}

export const BoardFilterModal: React.FC<Props> = ({ visible, onClose, boards, selectedBoard, onSelectBoard }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>ボード選択</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.option}
            onPress={() => onSelectBoard('all')}
          >
            <View style={[styles.radio, selectedBoard === 'all' && styles.radioSelected]}>
              {selectedBoard === 'all' && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.optionText}>すべてのボード</Text>
          </TouchableOpacity>

          {boards.map(board => (
            <TouchableOpacity
              key={board.id}
              style={styles.option}
              onPress={() => onSelectBoard(board.name)}
            >
              <View style={[styles.radio, selectedBoard === board.name && styles.radioSelected]}>
                {selectedBoard === board.name && <View style={styles.radioDot} />}
              </View>
              <View style={styles.boardOption}>
                <View style={[styles.boardColorIndicator, { backgroundColor: board.color }]} />
                <Text style={styles.optionText}>{board.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
    maxHeight: '80%',
    paddingBottom: 10, // Add some padding at the bottom
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  optionText: {
    fontSize: 16,
    color: '#2C3E50',
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
