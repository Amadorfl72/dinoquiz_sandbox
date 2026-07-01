import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const QuestionScreen = ({ question, options, dinosaurImage, onOptionSelect }) => {
  return (
    <View style={styles.container} testID="questionScreen">
      <Text style={styles.questionText} testID="questionStatement">{question}</Text>
      <Image 
        source={dinosaurImage} 
        style={styles.dinosaurImage} 
        accessibilityLabel="Dinosaur"
        testID="dinosaurImage"
      />
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => onOptionSelect(option)}
            testID="answerButton"
            accessibilityRole="button"
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
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 48,
  },
  optionText: {
    color: 'white',
    fontSize: 20,
  },
});

export default QuestionScreen;