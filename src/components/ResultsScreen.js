import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { resetGameState } from '../utils/gameUtils';

export default function ResultsScreen({ route }) {
  const { score, questions } = route.params;
  const navigation = useNavigation();

  const resetGame = () => {
    // Reset game state and select new questions
    resetGameState(
      (newQuestions) => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Question', params: { questionIndex: 0 } }],
        });
      },
      questions
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Resultados!</Text>
      <Text style={styles.score}>Puntuación: {score}/10</Text>
      
      {/* Stars display based on score */}
      <View style={styles.starsContainer}>
        {[...Array(Math.min(Math.floor(score / 3.34) + 1, 3))].map((_, i) => (
          <Text key={i} style={styles.star}>⭐</Text>
        ))}
      </View>
      
      <Text style={styles.message}>
        {score < 4 ? '¡Buen intento! Sigue aprendiendo.' : 
         score < 7 ? '¡Bien hecho! Sabes mucho sobre dinosaurios.' : 
         '¡Increíble! Eres un experto en dinosaurios.'}
      </Text>
      
      <Button 
        title="Volver a jugar" 
        onPress={resetGame}
        accessibilityLabel="Volver a jugar con nuevas preguntas"
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  score: {
    fontSize: 20,
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  star: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
});