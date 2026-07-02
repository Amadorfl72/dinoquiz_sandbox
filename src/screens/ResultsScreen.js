import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { setBestScore } from '../storage/scoreStorage';

export default function ResultsScreen({ route, navigation }) {
  const { score } = route.params;
  const [error, setError] = useState(null);

  useEffect(() => {
    const persistBestScore = async () => {
      try {
        await setBestScore(score);
      } catch (err) {
        setError('Could not save your best score. Try again later.');
        console.error('Failed to persist best score:', err);
      }
    };

    persistBestScore();
  }, [score]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Score: {score}/10</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {/* Rest of the ResultsScreen UI */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});