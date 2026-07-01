import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { resetGame, selectNewQuestions } from '../utils/gameLogic';

const ResultsScreen = ({ route }) => {
  const { score } = route.params;
  const navigation = useNavigation();

  const handlePlayAgain = () => {
    const newQuestions = selectNewQuestions();
    const gameState = resetGame(newQuestions);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Question', params: { 
        currentQuestion: gameState.currentQuestions[0],
        currentQuestionIndex: gameState.currentQuestionIndex,
        score: gameState.score
      } }],
    });
  };

  const stars = Math.min(3, Math.floor(score / 3.34) + 1);
  const motivationalMessages = [
    '¡Buen intento! Sigue practicando.',
    '¡Bien hecho! Estás mejorando.',
    '¡Excelente! Eres un experto en dinosaurios.'
  ];
  const message = motivationalMessages[stars - 1];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu puntuación: {score}/10</Text>
      <Text style={styles.stars}>{'⭐'.repeat(stars)}</Text>
      <Text style={styles.message}>{message}</Text>
      <Button
        title="Volver a jugar"
        onPress={handlePlayAgain}
        accessibilityLabel="Volver a jugar"
      />
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
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  stars: {
    fontSize: 30,
    marginBottom: 20,
  },
  message: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 30,
  },
});

export default ResultsScreen;