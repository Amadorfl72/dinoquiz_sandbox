import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const ResultsScreen = ({ score, onReplay }) => {
  const getMotivationalMessage = (score) => {
    if (score >= 0 && score <= 3) {
      return '¡Sigue intentándolo! ¡Lo harás mejor la próxima vez!';
    } else if (score >= 4 && score <= 6) {
      return '¡Buen trabajo! ¡Estás mejorando!';
    } else if (score >= 7 && score <= 8) {
      return '¡Excelente! ¡Eres un experto en dinosaurios!';
    } else if (score >= 9 && score <= 10) {
      return '¡Increíble! ¡Eres un verdadero paleontólogo!';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Has acertado {score}/10</Text>
      <Text style={styles.messageText}>{getMotivationalMessage(score)}</Text>
      <View style={styles.replayButton}>
        <Button title="Volver a jugar" onPress={onReplay} />
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
  scoreText: {
    fontSize: 24,
    marginBottom: 20,
  },
  messageText: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
  },
  replayButton: {
    minWidth: 200,
    minHeight: 48,
  },
});

export default ResultsScreen;