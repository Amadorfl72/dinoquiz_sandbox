import React, { useState, useEffect } from 'react';
import storage from '../utils/storage';
import { Text, View, StyleSheet } from 'react-native';

export default function ResultsScreen({ score }) {
  const [bestScore, setBestScore] = useState(0);
  const [showNewBest, setShowNewBest] = useState(false);

  useEffect(() => {
    // Load best score on component mount
    const savedBestScore = storage.get('bestScore', 0);
    setBestScore(savedBestScore);

    // Check if current score beats the best
    if (score > savedBestScore) {
      // Save new best score
      const success = storage.set('bestScore', score);
      if (success) {
        setBestScore(score);
        setShowNewBest(true);
        
        // Hide feedback after 3 seconds
        setTimeout(() => setShowNewBest(false), 3000);
      }
    }
  }, [score]);

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Tu puntuación: {score}/10</Text>
      
      {showNewBest && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>¡Nueva mejor puntuación!</Text>
        </View>
      )}
      
      <Text style={styles.bestScoreText}>Mejor puntuación: {bestScore}/10</Text>
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
    marginBottom: 20,
  },
  bestScoreText: {
    fontSize: 18,
    marginTop: 20,
  },
  feedbackContainer: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  feedbackText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});