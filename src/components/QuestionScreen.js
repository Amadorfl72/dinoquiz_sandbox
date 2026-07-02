import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const QuestionScreen = ({ statement, options, imageUri, onSelectAnswer }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{statement}</Text>
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }}
          style={styles.image}
          accessibilityLabel="Dinosaur image"
          testID="dinosaur-image"
        />
      ) : (
        <Image
          source={require('../assets/placeholder.png')}
          style={styles.image}
          accessibilityLabel="Dinosaur placeholder"
          testID="dinosaur-placeholder"
        />
      )}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.optionButton} 
            onPress={() => onSelectAnswer(option)}
            accessibilityRole="button"
            testID="answer-option-button"
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
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  image: {
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
    marginVertical: 8,
    borderRadius: 8,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
  },
  optionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default QuestionScreen;