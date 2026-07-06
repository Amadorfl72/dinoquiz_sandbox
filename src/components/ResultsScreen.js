import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { isNewBestScore, setBestScore, getBestScore } from '../utils/score';
import { strings } from '../strings';
import { logGameCompleted } from '../logging';
import { handleScoreUpdate } from '../services/scoreService';
import { useGame } from '../context/GameContext';

const ResultsScreen = ({ score, durationMs, appVersion, onReplay }) => {
  const [showNewBestFeedback, setShowNewBestFeedback] = useState(false);
  const { resetGameState, startNewRound } = useGame();

  useEffect(() => {
    logGameCompleted(score, durationMs, appVersion);
  }, [score, durationMs, appVersion]);

  useEffect(() => {
    const checkBestScore = async () => {
      if (isNewBestScore(score)) {
        try {
          setBestScore(score);
          setShowNewBestFeedback(true);
          await handleScoreUpdate(score);

          // Hide feedback after 3 seconds
          const timer = setTimeout(() => setShowNewBestFeedback(false), 3000);
          return () => clearTimeout(timer);
        } catch (error) {
          console.warn('Failed to persist best score:', error);
        }
      }
    };
    
    checkBestScore();
  }, [score]);

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

  const handleRestart = () => {
    resetGameState();
    startNewRound();
    if (onReplay) {
      onReplay();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Has acertado {score}/10</Text>
      <Text style={styles.messageText} testID="motivating-message">{getMotivationalMessage(score)}</Text>
      <Text style={styles.bestScoreText}>Tu mejor puntuación: {getBestScore()}</Text>

      {showNewBestFeedback && (
        <Text style={styles.newBestFeedbackText}>{strings.newBestScore}</Text>
      )}

      <View style={styles.replayButtonContainer}>
        <Button 
          title="Volver a jugar" 
          onPress={handleRestart} 
          style={styles.replayButton}
          accessibilityLabel="Volver a jugar"
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
    marginBottom: 20,
    textAlign: 'center',
  },
  bestScoreText: {
    fontSize: 16,
    marginBottom: 20,
  },
  newBestFeedbackText: {
    fontSize: 16,
    marginBottom: 20,
    color: 'green',
    fontWeight: 'bold',
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
