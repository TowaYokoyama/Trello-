import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  value: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
}

const SimpleWebDatePicker: React.FC<Props> = ({ value, onChange, onClose }) => {
  const [date, setDate] = useState(value || new Date());

  useEffect(() => {
    setDate(value || new Date());
  }, [value]);

  const changeDateTime = (part: 'year' | 'month' | 'day' | 'hour' | 'minute', amount: number) => {
    const newDate = new Date(date);
    if (part === 'year') newDate.setFullYear(newDate.getFullYear() + amount);
    if (part === 'month') newDate.setMonth(newDate.getMonth() + amount);
    if (part === 'day') newDate.setDate(newDate.getDate() + amount);
    if (part === 'hour') newDate.setHours(newDate.getHours() + amount);
    if (part === 'minute') newDate.setMinutes(newDate.getMinutes() + amount);
    setDate(newDate);
  };

  const handleConfirm = () => {
    onChange(date);
    onClose();
  };

  return (
    <View style={styles.container}>
      {/* Date Controls */}
      <View style={styles.pickerControls}>
        {/* Year */}
        <View style={styles.pickerUnit}>
          <TouchableOpacity onPress={() => changeDateTime('year', 1)} style={styles.button}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{date.getFullYear()}</Text>
          <TouchableOpacity onPress={() => changeDateTime('year', -1)} style={styles.button}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.labelText}>年</Text>

        {/* Month */}
        <View style={styles.pickerUnit}>
          <TouchableOpacity onPress={() => changeDateTime('month', 1)} style={styles.button}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{date.getMonth() + 1}</Text>
          <TouchableOpacity onPress={() => changeDateTime('month', -1)} style={styles.button}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.labelText}>月</Text>

        {/* Day */}
        <View style={styles.pickerUnit}>
          <TouchableOpacity onPress={() => changeDateTime('day', 1)} style={styles.button}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{date.getDate()}</Text>
          <TouchableOpacity onPress={() => changeDateTime('day', -1)} style={styles.button}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.labelText}>日</Text>
      </View>

      {/* Time Controls */}
      <View style={styles.pickerControls}>
        {/* Hour */}
        <View style={styles.pickerUnit}>
          <TouchableOpacity onPress={() => changeDateTime('hour', 1)} style={styles.button}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{String(date.getHours()).padStart(2, '0')}</Text>
          <TouchableOpacity onPress={() => changeDateTime('hour', -1)} style={styles.button}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.labelText}>時</Text>

        {/* Minute */}
        <View style={styles.pickerUnit}>
          <TouchableOpacity onPress={() => changeDateTime('minute', 1)} style={styles.button}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{String(date.getMinutes()).padStart(2, '0')}</Text>
          <TouchableOpacity onPress={() => changeDateTime('minute', -1)} style={styles.button}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.labelText}>分</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={onClose} style={[styles.actionButton, styles.cancelButton]}>
          <Text style={styles.actionButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleConfirm} style={[styles.actionButton, styles.okButton]}>
          <Text style={[styles.actionButtonText, styles.okButtonText]}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#2c2c3e',
    borderWidth: 1,
    borderColor: '#64ffda',
    borderRadius: 5,
    marginTop: 10,
  },
  pickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pickerUnit: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    marginVertical: 5,
  },
  buttonText: {
    color: '#64ffda',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    minWidth: 28, // Ensure two-digit numbers don't jump around
    textAlign: 'center',
  },
  labelText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
    marginRight: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#ff5252',
  },
  okButton: {
    backgroundColor: '#64ffda',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  okButtonText: {
    color: '#1a1a2e',
  },
});

export default SimpleWebDatePicker;
