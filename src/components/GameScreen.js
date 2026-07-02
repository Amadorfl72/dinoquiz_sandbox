import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import questions from '../data/questions.json';

export default function GameScreen({ navigation }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  useEffect(() => {
    // Select 10 random questions without repetition
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    setSelectedQuestions(shuffled.slice(0, 10));
  }, []);

  const handleAnswerPress = (isCorrect) => {
    if (isCorrect) {
      setScore(score + 1);
    }

    if (currentQuestionIndex < selectedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      navigation.navigate('Results', { score });
    }
  };

  if (selectedQuestions.length === 0) {
    return (
      <View style={styles.container}>
        <Text>Cargando preguntas...</Text>
      </View>
    );
  }

  const currentQuestion = selectedQuestions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{currentQuestion.question}</Text>
      {currentQuestion.options.map((option, index) => (
        <Button
          key={index}
          title={option.text}
          onPress={() => handleAnswerPress(option.isCorrect)}
          accessibilityLabel={`Opción ${index + 1}: ${option.text}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  question: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
});