import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { setBestScore, getBestScore } from '../storage/scoreStorage';

const ResultsScreen = ({ route, navigation }) => {
  const { score } = route.params;
  const [bestScore, setBestScoreState] = useState(0);
  const [error, setError] = useState(null);
  const [isNewBest, setIsNewBest] = useState(false);

  useEffect(() => {
    const checkBestScore = async () => {
      try {
        // First try to save the current score
        await setBestScore(score);
        
        // Then get the best score to compare
        const storedBestScore = await getBestScore();
        setBestScoreState(storedBestScore);
        
        // Check if this is a new best score
        setIsNewBest(score > storedBestScore);
      } catch (err) {
        console.error('Error handling best score:', err);
        setError('Could not save your best score. Try again later.');
        
        // Even if saving failed, try to get the best score for display
        try {
          const storedBestScore = await getBestScore();
          setBestScoreState(storedBestScore);
        } catch (getErr) {
          console.error('Error getting best score:', getErr);
        }
      }
    };

    checkBestScore();
  }, [score]);

  const getStars = (score) => {
    if (score >= 7) return '⭐⭐⭐';
    if (score >= 4) return '⭐⭐';
    return '⭐';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Score: {score}/10</Text>
      <Text style={styles.stars}>{getStars(score)}</Text>
      
      {bestScore > 0 && (
        <Text style={styles.bestScore}>Best Score: {bestScore}/10</Text>
      )}
      
      {isNewBest && (
        <Text style={styles.newBest}>New Best Score!</Text>
      )}
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
      
      <Button
        title="Play Again"
        onPress={() => navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })}
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
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stars: {
    fontSize: 36,
    marginBottom: 20,
  },
  bestScore: {
    fontSize: 18,
    marginBottom: 10,
  },
  newBest: {
    fontSize: 20,
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  error: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
  },
});

export default ResultsScreen;