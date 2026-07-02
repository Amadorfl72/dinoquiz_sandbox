import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBestScore, saveBestScore } from '../../utils/storage';

export default function ResultsScreen({ route, navigation }) {
  const { score } = route.params;
  const [bestScore, setBestScore] = useState(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkBestScore = async () => {
      try {
        const storedBestScore = await getBestScore();
        setBestScore(storedBestScore);
        
        if (score > storedBestScore) {
          await saveBestScore(score);
          setBestScore(score);
          setIsNewBest(true);
        }
      } catch (err) {
        setError('Could not load best score');
        console.error('Error checking best score:', err);
      }
    };

    checkBestScore();
  }, [score]);

  return (
    <View style={styles.container}>
      <Text style={styles.score}>Your score: {score}/10</Text>
      
      {bestScore !== null && (
        <Text style={styles.bestScore}>Best score: {bestScore}/10</Text>
      )}
      
      {isNewBest && (
        <Text style={styles.newBest}>New best score! 🎉</Text>
      )}
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  score: {
    fontSize: 24,
    marginBottom: 16,
  },
  bestScore: {
    fontSize: 20,
    marginBottom: 16,
  },
  newBest: {
    fontSize: 20,
    color: 'green',
    marginBottom: 16,
  },
  error: {
    fontSize: 16,
    color: 'red',
  },
});