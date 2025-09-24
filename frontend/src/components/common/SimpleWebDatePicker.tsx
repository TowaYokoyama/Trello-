import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  initialDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
}

export const SimpleWebDatePicker: React.FC<Props> = ({ initialDate, onDateChange, onClose }) => {
  const [date, setDate] = useState(initialDate);

  const changeDate = (part: 'year' | 'month' | 'day', amount: number) => {
    const newDate = new Date(date);
    if (part === 'year') newDate.setFullYear(newDate.getFullYear() + amount);
    if (part === 'month') newDate.setMonth(newDate.getMonth() + amount);
    if (part === 'day') newDate.setDate(newDate.getDate() + amount);
    setDate(newDate);
  };

  const handleSetDate = () => {
    onDateChange(date);
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        <TouchableOpacity onPress={() => changeDate('year', -1)} style={styles.button}><Text style={styles.buttonText}>-</Text></TouchableOpacity>
        <Text style={styles.dateText}>{date.getFullYear()}</Text>
        <TouchableOpacity onPress={() => changeDate('year', 1)} style={styles.button}><Text style={styles.buttonText}>+</Text></TouchableOpacity>
        <Text style={styles.labelText}>年</Text>
      </View>

      <View style={styles.pickerRow}>
        <TouchableOpacity onPress={() => changeDate('month', -1)} style={styles.button}><Text style={styles.buttonText}>-</Text></TouchableOpacity>
        <Text style={styles.dateText}>{date.getMonth() + 1}</Text>
        <TouchableOpacity onPress={() => changeDate('month', 1)} style={styles.button}><Text style={styles.buttonText}>+</Text></TouchableOpacity>
        <Text style={styles.labelText}>月</Text>
      </View>

      <View style={styles.pickerRow}>
        <TouchableOpacity onPress={() => changeDate('day', -1)} style={styles.button}><Text style={styles.buttonText}>-</Text></TouchableOpacity>
        <Text style={styles.dateText}>{date.getDate()}</Text>
        <TouchableOpacity onPress={() => changeDate('day', 1)} style={styles.button}><Text style={styles.buttonText}>+</Text></TouchableOpacity>
        <Text style={styles.labelText}>日</Text>
      </View>

      <TouchableOpacity onPress={handleSetDate} style={[styles.button, styles.setButton]}>
        <Text style={styles.setButtonText}>設定</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginHorizontal: 10,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    width: 50,
    textAlign: 'center',
  },
  labelText: {
    fontSize: 16,
    marginLeft: 5,
  },
  setButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    width: '100%',
    alignItems: 'center',
  },
  setButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
