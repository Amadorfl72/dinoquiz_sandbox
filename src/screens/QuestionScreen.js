import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function QuestionScreen({ route }) {
  const navigation = useNavigation();
  const { question, questionId, totalQuestions, currentScore } = route.params;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    const correct = answer === question.correctAnswer;
    setIsCorrect(correct);
    
    // Navigate to FunFact screen after a short delay
    setTimeout(() => {
      navigation.navigate('FunFact', {
        fact: question.fact,
        isLastQuestion: questionId === totalQuestions,
        nextQuestionId: questionId + 1,
        score: currentScore + (correct ? 1 : 0),
        totalQuestions: totalQuestions,
        question: question
      });
    }, 1000);
  };

  return (
    <View style={styles.container} testID="question-screen">
      <Text style={styles.questionText} testID="question-text">{question.question}</Text>
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