import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function QuestionScreen({ route }) {
  const navigation = useNavigation();
  const { questionId } = route.params;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);

  // Mock data - replace with actual data fetching
  const question = {
    id: questionId,
    text: '¿Qué dinosaurio tenía tres cuernos?',
    options: ['T-Rex', 'Triceratops', 'Velociraptor', 'Estegosaurio'],
    correctAnswer: 'Triceratops',
    fact: {
      text: 'El Triceratops usaba sus tres cuernos para defenderse de depredadores como el T-Rex.',
      image: 'triceratops_image_url',
    },
  };

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    const correct = answer === question.correctAnswer;
    setIsCorrect(correct);
    
    // Navigate to FunFact screen after a short delay
    setTimeout(() => {
      navigation.navigate('FunFact', {
        fact: question.fact,
        isLastQuestion: questionId === 10, // Assuming 10 questions total
        nextQuestionId: questionId + 1,
        score: correct ? 1 : 0, // Update score based on correctness
      });
    }, 1000);
  };

  return (
    <View style={styles.container} testID="question-screen">
      <Text style={styles.questionText} testID="question-text">{question.text}</Text>
      {question.options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.optionButton,
            selectedAnswer === option && (isCorrect ? styles.correctOption : styles.incorrectOption),
          ]}
          onPress={() => !selectedAnswer && handleAnswer(option)}
          disabled={!!selectedAnswer}
          testID={`answer-option-${option}`}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 22,
    marginBottom: 30,
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  optionText: {
    fontSize: 18,
    textAlign: 'center',
  },
  correctOption: {
    backgroundColor: '#a5d6a7',
  },
  incorrectOption: {
    backgroundColor: '#ef9a9a',
  },
});