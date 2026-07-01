import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import strings from '../strings.json';

export default function ResultsScreen({ score, onReplay }) {
  const totalQuestions = 10;
  const getStars = (score) => {
    if (score <= 3) return '⭐';
    if (score <= 6) return '⭐⭐';
    return '⭐⭐⭐';
  };

  const getMotivationalMessage = (score) => {
    if (score <= 3) return strings.resultsScreen.messages.low;
    if (score <= 6) return strings.resultsScreen.messages.medium;
    if (score <= 8) return strings.resultsScreen.messages.high;
    return strings.resultsScreen.messages.perfect;
  };

  return (
    <View style={styles.container} testID="results-screen">
      <Text style={styles.title}>{strings.resultsScreen.title}</Text>
      <Text style={styles.score}>
        {strings.resultsScreen.score.replace('{score}', score)}
      </Text>
      <Text style={styles.stars}>{getStars(score)}</Text>
      <Text 
        style={styles.message}
        testID="motivating-message"
      >
        {getMotivationalMessage(score)}
      </Text>
      <TouchableOpacity 
        style={styles.replayButton} 
        onPress={onReplay} 
        testID="play-again-button"
        accessibilityLabel={strings.resultsScreen.replayButton}
        accessibilityRole="button"
      >
        <Text style={styles.replayButtonText}>{strings.resultsScreen.replayButton}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  score: {
    fontSize: 24,
    marginBottom: 10,
    color: '#2c3e50',
  },
  stars: {
    fontSize: 40,
    marginBottom: 20,
  },
  message: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 30,
    color: '#2c3e50',
  },
  replayButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 200,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replayButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});