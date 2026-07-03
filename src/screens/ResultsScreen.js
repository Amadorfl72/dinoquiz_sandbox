import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { setBestScore, getBestScore } from '../storage/scoreStorage';

const ResultsScreen = ({ route, navigation }) => {
  const { score } = route.params;
  const [bestScore, setBestScoreState] = useState(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false);
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    const checkBestScore = async () => {
      try {
        // First try to save the current score
        await setBestScore(score);
        
        // Then get the stored best score to compare
        const storedBestScore = await getBestScore();
        setBestScoreState(storedBestScore);
        
        // Only show new best score message if we successfully got the stored score
        if (score > storedBestScore) {
          setIsNewBestScore(true);
        }
      } catch (error) {
        console.error('Error handling best score:', error);
        setStorageError('Could not save your best score. Try again later.');
        
        // If getBestScore fails after setBestScore, try to get it again as fallback
        try {
          const fallbackBestScore = await getBestScore();
          setBestScoreState(fallbackBestScore);
        } catch (fallbackError) {
          console.error('Fallback best score load failed:', fallbackError);
          // At this point we just won't show the best score
        }
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
      
      {isNewBestScore && (
        <Text style={styles.newBestText}>New Best Score!</Text>
      )}
      
      {storageError && (
        <Text style={styles.errorText}>{storageError}</Text>
      )}
      
      <Button
        title="Play Again"
        onPress={() => navigation.navigate('Home')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    marginBottom: 20,
  },
  bestScoreText: {
    fontSize: 20,
    marginBottom: 10,
  },
  newBestText: {
    fontSize: 22,
    color: 'green',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
  },
});

export default ResultsScreen;