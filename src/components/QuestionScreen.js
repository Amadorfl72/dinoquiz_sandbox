import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const QuestionScreen = ({ question, options, dinosaurImage, onSelect }) => {
  return (
    <View style={styles.container} testID="question-screen">
      <Text style={styles.questionText} accessibilityRole="text">{question}</Text>
      <Image 
        source={dinosaurImage} 
        style={styles.dinosaurImage} 
        testID="dinosaur-image"
        accessibilityLabel="Illustration of the dinosaur"
        accessibilityRole="image"
      />
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => onSelect(option)}
            accessibilityRole="button"
            testID={`answer-option-button-${index}`}
            accessibilityLabel={`Answer option ${index + 1}: ${option}`}
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
    backgroundColor: '#F5F5F5',
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    minHeight: 48,
  },
  dinosaurImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    minWidth: '80%',
  },
  optionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default QuestionScreen;