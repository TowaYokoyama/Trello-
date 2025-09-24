import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  onPress: () => void;
}

export const HeaderSettingsButton: React.FC<Props> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.icon}>⚙</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  icon: {
    color: 'white',
    fontSize: 22, // Increased size slightly for better visibility
  },
});
