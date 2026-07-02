import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import ResultsScreen from './components/ResultsScreen';

const App = () => {
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleReplay = () => {
    setScore(0);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      {showResults ? (
        <ResultsScreen score={score} onReplay={handleReplay} />
      ) : (
        <Button title="Simular Partida" onPress={() => setShowResults(true)} />
      )}
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
});

export default App;