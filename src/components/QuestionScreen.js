import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';

const QuestionScreen = ({ question, options, dinosaurImage, onOptionSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>
      <Image source={dinosaurImage} style={styles.dinosaurImage} />
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => onOptionSelect(option)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  questionText: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  dinosaurImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    marginVertical: 10,
    borderRadius: 5,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    color: 'white',
    fontSize: 20,
  },
});

export default QuestionScreen;