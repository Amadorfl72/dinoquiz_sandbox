import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { setBestScore, getBestScore } from '../storage/scoreStorage';

export default function ResultsScreen({ route, navigation }) {
  const { score } = route.params;
  const [bestScore, setBestScoreState] = useState(null);
  const [error, setError] = useState(null);
  const [isNewBest, setIsNewBest] = useState(false);

  useEffect(() => {
    const checkBestScore = async () => {
      try {
        // First try to save the current score
        await setBestScore(score);
        
        // Then get the stored best score
        const storedBestScore = await getBestScore();
        setBestScoreState(storedBestScore);
        
        // Check if this is a new best score
        setIsNewBest(score > storedBestScore);
      } catch (err) {
        console.error('Error handling scores:', err);
        setError('Could not save your best score. Try again later.');
        
        // If getBestScore fails, don't show new best message
        setIsNewBest(false);
      }
    };

    checkBestScore();
  }, [score]);

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Your Score: {score}/10</Text>
      
      {bestScore !== null && (
        <Text style={styles.bestScoreText}>Best Score: {bestScore}/10</Text>
      )}
      
      {isNewBest && (
        <Text style={styles.newBestText}>New Best Score!</Text>
      )}
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      <Button
        title="Play Again"
        onPress={() => navigation.navigate('Home')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    marginBottom: 16,
  },
  bestScoreText: {
    fontSize: 20,
    marginBottom: 16,
  },
  newBestText: {
    fontSize: 22,
    color: 'green',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 16,
  },
});