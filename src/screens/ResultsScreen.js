import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { setBestScore, getBestScore } from '../storage/scoreStorage';

export default function ResultsScreen({ route, navigation }) {
  const { score } = route.params;
  const [error, setError] = useState(null);
  const [bestScore, setBestScoreState] = useState(0);

  useEffect(() => {
    const persistAndLoadBestScore = async () => {
      try {
        // First try to persist the new score
        await setBestScore(score);
        
        // Then load the current best score to display
        const currentBest = await getBestScore();
        setBestScoreState(currentBest);
      } catch (err) {
        setError('Could not save your best score. Try again later.');
        console.error('Failed to persist best score:', err);
        
        // Still try to load the best score even if saving failed
        try {
          const currentBest = await getBestScore();
          setBestScoreState(currentBest);
        } catch (loadErr) {
          console.error('Failed to load best score:', loadErr);
        }
      }
    };

    persistAndLoadBestScore();
  }, [score]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Score: {score}/10</Text>
      <Text style={styles.bestScore}>Best Score: {bestScore}/10</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        title="Play Again"
        onPress={() => navigation.navigate('Home')}
        accessibilityLabel="Play the game again"
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
    marginBottom: 10,
  },
  bestScore: {
    fontSize: 20,
    marginBottom: 20,
  },
  error: {
    color: 'red',
    marginTop: 10,
    marginBottom: 20,
  },
});