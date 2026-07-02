import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const QuestionScreen = ({ question, onAnswerSelected }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.statement}</Text>
      <Image source={{ uri: question.illustration }} style={styles.dinosaurImage} testID="dinosaur-illustration" />
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => onAnswerSelected(option)}
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
    borderRadius: 10,
    alignItems: 'center',
  },
  optionText: {
    color: 'white',
    fontSize: 18,
  },
});

export default QuestionScreen;