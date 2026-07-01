import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../utils/useResponsive';

export default function QuestionScreen({ question, options, image, onSelect }) {
  const { theme } = useTheme();
  const responsiveStyle = useResponsive();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={styles.questionContainer}>
        <Text style={[styles.questionText, { color: theme.textColor, fontSize: responsiveStyle.questionText }]}>{question}</Text>
        {image ? (
          <Image source={{ uri: image }} style={[styles.dinoImage, { width: responsiveStyle.dinoImageSize, height: responsiveStyle.dinoImageSize }]} />
        ) : (
          <View style={[styles.placeholder, { width: responsiveStyle.dinoImageSize, height: responsiveStyle.dinoImageSize }]}>
            <Text style={styles.placeholderText}>Dinosaurio</Text>
          </View>
        )}
      </View>
      
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity 
            key={index}
            style={[styles.optionButton, { 
              backgroundColor: theme.buttonColor,
              minHeight: responsiveStyle.optionButtonHeight,
              minWidth: '100%'
            }]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, { color: theme.buttonTextColor, fontSize: responsiveStyle.optionText }]}>{option}</Text>
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
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
    fontFamily: 'KidsFont',
  },
  dinoImage: {
    resizeMode: 'contain',
  },
  placeholder: {
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  optionText: {
    fontFamily: 'KidsFont',
    textAlign: 'center',
  },
});