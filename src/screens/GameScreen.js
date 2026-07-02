import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import questionsData from '../data/questions.json';
import Question from '../components/Question';
import ResultsScreen from '../components/ResultsScreen';
import { initializeGame, resetGameState } from '../utils/gameUtils';

export default function GameScreen({ navigation }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  const resetGame = () => {
    initializeGame(questionsData, setQuestions, setCurrentQuestionIndex, setScore);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      resetGame();
    });

    return unsubscribe;
  }, [navigation]);

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      setScore(score + 1);
    }
    
    // Move to next question or results
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      navigation.navigate('Results', { score });
    }
  };

  if (questions.length === 0 || currentQuestionIndex >= questions.length) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Question 
        question={questions[currentQuestionIndex]} 
        onAnswer={handleAnswer} 
      />
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
});