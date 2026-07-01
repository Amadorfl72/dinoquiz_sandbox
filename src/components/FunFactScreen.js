import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function FunFactScreen({ route }) {
  const navigation = useNavigation();
  const { fact, isLastQuestion, nextQuestionId, score } = route.params;

  const handleNext = () => {
    if (isLastQuestion) {
      navigation.navigate('Results', { score });
    } else {
      navigation.navigate('Question', { questionId: nextQuestionId });
    }
  };

  return (
    <View style={styles.container} testID="fun-fact-screen">
      <Text style={styles.title}>¡Dato Curioso!</Text>
      <Image source={{ uri: fact.image }} style={styles.image} />
      <Text style={styles.factText} testID="fun-fact-text">{fact.text}</Text>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext} testID="next-button">
        <Text style={styles.nextButtonText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  factText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#555',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});