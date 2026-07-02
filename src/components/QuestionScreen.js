import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const QuestionScreen = ({ question, options, dinosaurImage, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>
      <Image 
        source={dinosaurImage ? { uri: dinosaurImage } : require('../assets/placeholder.png')} 
        style={styles.image} 
        accessibilityLabel="Dinosaur image"
      />
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.optionButton} 
            onPress={() => onSelect(option)}
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
    justifyContent: 'center',
  },
  optionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default QuestionScreen;