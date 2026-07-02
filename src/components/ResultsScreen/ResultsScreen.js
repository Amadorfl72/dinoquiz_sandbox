import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NewBestScoreFeedback from '../NewBestScoreFeedback';

const ResultsScreen = ({ route }) => {
  const { score, previousBestScore } = route.params;
  const [showNewBestScore, setShowNewBestScore] = useState(false);

  useEffect(() => {
    if (score > previousBestScore) {
      setShowNewBestScore(true);
    }
  }, [score, previousBestScore]);

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Tu puntuación: {score}/10</Text>
      {showNewBestScore && <NewBestScoreFeedback isNewBestScore={true} />}
      {/* Rest of the results screen UI */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default ResultsScreen;