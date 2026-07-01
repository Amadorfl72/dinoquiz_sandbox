import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ResultsScreen = ({ score, onReplay }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Tu puntuación: {score}/10</Text>
      <Text style={styles.messageText}>¡Buen trabajo! Sigue aprendiendo.</Text>
      <TouchableOpacity style={styles.replayButton} onPress={onReplay}>
        <Text style={styles.replayButtonText}>Volver a Jugar</Text>
      </TouchableOpacity>
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
  scoreText: {
    fontSize: 24,
    marginBottom: 20,
  },
  messageText: {
    fontSize: 18,
    marginBottom: 40,
  },
  replayButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replayButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});

export default ResultsScreen;