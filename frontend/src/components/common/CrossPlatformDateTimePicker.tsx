import React from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  value: Date;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
}

// This is the native implementation (iOS, Android)
const CrossPlatformDateTimePicker: React.FC<Props> = ({ value, onChange }) => {
  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="spinner" // Use spinner for a consistent and visible UI
      onChange={onChange}
    />
  );
};

export default CrossPlatformDateTimePicker;
