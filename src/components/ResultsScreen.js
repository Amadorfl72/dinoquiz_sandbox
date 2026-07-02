import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const ResultsScreen = ({ score, onReplay }) => {
  const getMotivationalMessage = (score) => {
    if (score >= 0 && score <= 3) {
      return '¡No te rindas! ¡Sigue intentándolo!';
    } else if (score >= 4 && score <= 6) {
      return '¡Buen trabajo! ¡Puedes mejorar!';
    } else if (score >= 7 && score <= 8) {
      return '¡Muy bien! ¡Casi lo logras!';
    } else if (score >= 9 && score <= 10) {
      return '¡Excelente! ¡Eres un genio!';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Has acertado {score}/10</Text>
      <Text style={styles.messageText} testID="motivating-message">{getMotivationalMessage(score)}</Text>
      <View style={styles.replayButtonContainer}>
        <Button 
          title="Volver a jugar" 
          onPress={onReplay} 
          style={styles.replayButton}
        />
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
  replayButtonContainer: {
    minWidth: 200,
    minHeight: 48,
  },
  replayButton: {
    minHeight: 48,
  },
});

export default ResultsScreen;