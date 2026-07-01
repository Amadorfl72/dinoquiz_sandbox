import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import AnswerOptionButton from './AnswerOptionButton';
import DinoImage from './DinoImage';

const { width } = Dimensions.get('window');

const QuestionScreen = ({ 
  question, 
  options, 
  selectedOption, 
  onSelectOption, 
  isCorrect, 
  showFeedback,
  dinoImage
}) => {
  const isSmallDevice = width < 375;
  
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question}</Text>
      
      <DinoImage source={dinoImage} style={styles.dinoImage} />
      
      <View style={[
        styles.optionsContainer, 
        isSmallDevice && styles.smallDeviceOptionsContainer
      ]}>
        {options.map((option, index) => (
          <AnswerOptionButton
            key={index}
            option={option}
            onPress={() => onSelectOption(option)}
            isSelected={selectedOption === option}
            isCorrect={isCorrect}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
    color: '#333333',
  },
  dinoImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginBottom: 24,
  },
  optionsContainer: {
    width: '100%',
  },
  smallDeviceOptionsContainer: {
    paddingHorizontal: 8,
  },
});

export default QuestionScreen;