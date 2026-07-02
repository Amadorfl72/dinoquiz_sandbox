import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';

const QuestionScreen = ({ question, options, dinosaurImage, onOptionSelect }) => {
  // Convert 48dp to pixels for React Native
  const buttonSize = Math.round(Dimensions.get('window').width * 0.15); // Approximately 48dp on most devices
  
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>
      <Image 
        source={dinosaurImage} 
        style={styles.dinosaurImage} 
        accessibilityLabel="Dinosaur illustration"
        testID="dinosaur-image"
      />
      <View style={styles.optionsContainer}>
        {options.slice(0, 3).map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.optionButton, { minHeight: buttonSize, minWidth: buttonSize }]}
            onPress={() => onOptionSelect(option)}
            accessibilityRole="button"
            accessibilityLabel={`Answer option: ${option}`}
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
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    marginVertical: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    color: 'white',
    fontSize: 20,
  },
});

export default QuestionScreen;