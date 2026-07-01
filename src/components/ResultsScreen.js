import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ResultsScreen = ({ score, onReplay }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Tu puntuación: {score}/10</Text>
      <TouchableOpacity style={styles.replayButton} onPress={onReplay}>
        <Text style={styles.buttonText}>Volver a jugar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  scoreText: {
    fontSize: 24,
    marginBottom: 20,
  },
  replayButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default ResultsScreen;