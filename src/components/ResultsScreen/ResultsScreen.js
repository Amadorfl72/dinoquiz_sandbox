import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ResultsScreen({ route }) {
  const { score } = route.params;
  const navigation = useNavigation();

  const getStars = (score) => {
    if (score <= 3) return '⭐';
    if (score <= 6) return '⭐⭐';
    return '⭐⭐⭐';
  };

  const getMessage = (score) => {
    const messages = [
      '¡Buen intento! Sigue practicando.',
      '¡Bien hecho! Estás mejorando.',
      '¡Excelente! Eres un experto en dinosaurios.'
    ];
    
    if (score <= 3) return messages[0];
    if (score <= 6) return messages[1];
    return messages[2];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultados</Text>
      <Text style={styles.score}>{score}/10</Text>
      <Text style={styles.stars}>{getStars(score)}</Text>
      <Text style={styles.message}>{getMessage(score)}</Text>
      
      <TouchableOpacity 
        style={styles.playAgainButton}
        onPress={() => navigation.replace('Quiz')}
        testID="play-again-button"
      >
        <Text style={styles.playAgainButtonText}>Volver a jugar</Text>
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
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  score: {
    fontSize: 22,
    marginBottom: 10,
    color: '#333',
  },
  stars: {
    fontSize: 30,
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
  },
  playAgainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});