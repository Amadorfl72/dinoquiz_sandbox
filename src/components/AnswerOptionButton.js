import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const AnswerOptionButton = ({ option, onPress, isSelected, isCorrect }) => {
  const isSmallDevice = width < 375; // iPhone SE and similar small devices
  
  const buttonStyle = [
    styles.button,
    isSelected && isCorrect && styles.correct,
    isSelected && !isCorrect && styles.incorrect,
    isSmallDevice && styles.smallDeviceButton
  ];

  return (
    <TouchableOpacity 
      style={buttonStyle}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Answer option: ${option}`}
    >
      <Text style={styles.text}>{option}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    minWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  smallDeviceButton: {
    minHeight: 48,
    minWidth: '100%',
    padding: 12,
  },
  text: {
    fontSize: 18,
    color: '#333333',
    textAlign: 'center',
  },
  correct: {
    backgroundColor: '#4CAF50',
  },
  incorrect: {
    backgroundColor: '#F44336',
  },
});

export default AnswerOptionButton;