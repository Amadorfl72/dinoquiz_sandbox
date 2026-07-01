import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBestScore } from '../utils/storage';

const ResultsScreen = ({ route }) => {
  const { currentScore } = route.params;
  const [bestScore, setBestScore] = React.useState(0);

  React.useEffect(() => {
    const loadBestScore = async () => {
      const storedBestScore = await getBestScore();
      setBestScore(storedBestScore);
    };
    loadBestScore();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Partida Terminada!</Text>
      <Text style={styles.score}>Tu puntuación: {currentScore}/10</Text>
      <Text style={styles.bestScore}>Mejor puntuación: {bestScore}/10</Text>
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
});

export default ResultsScreen;