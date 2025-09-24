import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SimpleWebDatePicker } from './SimpleWebDatePicker';

// This is the web implementation

interface Props {
  value: Date;
  onChange: (event: any, selectedDate?: Date) => void;
}

const CrossPlatformDateTimePicker: React.FC<Props> = ({ value, onChange }) => {
  const handleDateChange = (date: Date) => {
    // Create a synthetic event object to match the native one
    onChange({ type: 'set' }, date);
  };

  return (
    <View style={styles.container}>
      <SimpleWebDatePicker 
        initialDate={value} 
        onDateChange={handleDateChange} 
        onClose={() => onChange({ type: 'dismiss' }, undefined)} // Simulate a dismiss event
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // This style ensures that the datepicker is centered like a modal
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});

export default CrossPlatformDateTimePicker;
