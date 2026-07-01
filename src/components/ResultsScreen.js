import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBestScore } from '../utils/storage';

const ResultsScreen = ({ route }) => {
  const { currentScore } = route.params;
  const [bestScore, setBestScore] = React.useState(0);

  React.useEffect(() => {
    const loadBestScore = async () => {
      try {
        const storedBestScore = await getBestScore();
        setBestScore(storedBestScore);
      } catch (error) {
        console.error('Failed to load best score:', error);
        setBestScore(0);
      }
    };
    loadBestScore();
  }, []);

  const isNewRecord = currentScore > bestScore;

  return (
    <View style={styles.container} testID="results-screen">
      <Text style={styles.title}>¡Partida Terminada!</Text>
      <Text style={styles.score} testID="current-score">Tu puntuación: {currentScore}/10</Text>
      <Text 
        style={styles.bestScore} 
        testID="best-score"
        accessibilityLabel={`Mejor puntuación: ${bestScore} de 10`}
      >
        Mejor puntuación: {bestScore}/10
      </Text>
      {isNewRecord && (
        <Text style={styles.newRecord} testID="new-record-indicator">¡Nuevo récord! 🎉</Text>
      )}
      {/* Rest of the results screen UI */}
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
    marginBottom: 20,
  },
  score: {
    fontSize: 20,
    marginBottom: 10,
  },
  bestScore: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  newRecord: {
    fontSize: 18,
    color: 'green',
    marginTop: 10,
  },
});

export default ResultsScreen;