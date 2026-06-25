import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  InteractionManager,
} from 'react-native';
import { resetGameState, selectQuestions } from '../store/gameStore';
import { withTimeout } from '../utils/performance';

interface ResultScreenProps {
  navigation: any;
  score: number;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ navigation, score }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePlayAgain = useCallback(async () => {
    if (isLoading) return; // Prevent multiple clicks and race conditions

    setIsLoading(true);

    try {
      // Parallelize independent operations
      const resetPromise = resetGameState();
      const selectPromise = selectQuestions();

      // Enforce <2s SLA (using 1500ms to leave room for navigation)
      await withTimeout(
        Promise.all([resetPromise, selectPromise]),
        1500,
        'Game reset took too long'
      );

      // Defer navigation until interactions are complete to ensure smooth transition
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate('Game');
      });
    } catch (error) {
      console.error('Failed to restart game within SLA', error);
      // Fallback: proceed with navigation even if timeout occurs to avoid blocking user
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate('Game');
      });
    } finally {
      // Reset loading state; screen will unmount on navigation anyway
      setIsLoading(false);
    }
  }, [isLoading, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Has acertado {score}/10</Text>
      <Text style={styles.messageText}>¡Sigue intentándolo, lo estás haciendo genial!</Text>

      <TouchableOpacity
        onPress={handlePlayAgain}
        disabled={isLoading}
        style={[styles.button, isLoading && styles.buttonDisabled]}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Volver a jugar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  messageText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 40,
    color: '#555',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '80%',
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ResultScreen;
