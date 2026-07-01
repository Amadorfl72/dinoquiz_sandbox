import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBestScore } from '../utils/storage';

const ResultsScreen = ({ route }) => {
  const { currentScore } = route.params;
  const [bestScore, setBestScore] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const loadBestScore = async () => {
      try {
        const storedBestScore = await getBestScore();
        setBestScore(storedBestScore);
      } catch (error) {
        console.error('Failed to load best score:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadBestScore();
  }, []);

  const isNewRecord = bestScore !== null && currentScore > bestScore;

  if (loading) {
    return (
      <View style={styles.container} testID="results-screen">
        <Text style={styles.title}>¡Partida Terminada!</Text>
        <Text style={styles.score} testID="current-score">Tu puntuación: {currentScore}/10</Text>
        <Text style={styles.loading} testID="best-score-loading">Cargando récord...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="results-screen">
      <Text style={styles.title}>¡Partida Terminada!</Text>
      <Text style={styles.score} testID="current-score">Tu puntuación: {currentScore}/10</Text>
      
      {error ? (
        <Text style={styles.error} testID="best-score-error">No se pudo cargar el récord</Text>
      ) : (
        <Text 
          style={styles.bestScore} 
          testID="best-score"
          accessibilityLabel={`Mejor puntuación: ${bestScore !== null ? bestScore : 0} de 10`}
        >
          Mejor puntuación: {bestScore !== null ? bestScore : 0}/10
        </Text>
      )}
      
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
  loading: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#666',
  },
  error: {
    fontSize: 18,
    color: 'red',
  },
});

export default ResultsScreen;