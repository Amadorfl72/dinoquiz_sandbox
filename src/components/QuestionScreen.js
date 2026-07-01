import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function QuestionScreen({ question, options, image, onSelect }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={styles.questionContainer}>
        <Text style={[styles.questionText, { color: theme.textColor }]}>{question}</Text>
        {image ? (
          <Image source={{ uri: image }} style={styles.dinoImage} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Dinosaurio</Text>
          </View>
        )}
      </View>
      
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity 
            key={index}
            style={[styles.optionButton, { backgroundColor: theme.buttonColor }]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, { color: theme.buttonTextColor }]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
    fontFamily: 'KidsFont',
  },
  dinoImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  placeholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  placeholderText: {
    fontSize: 18,
    color: '#888',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  optionText: {
    fontSize: 20,
    fontFamily: 'KidsFont',
    textAlign: 'center',
  },
});