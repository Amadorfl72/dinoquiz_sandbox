import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ResultsScreen({ route }) {
  const navigation = useNavigation();
  const { score } = route.params;

  const handleRestartGame = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'GameScreen' }],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Resultados!</Text>
      <Text style={styles.score}>Puntuación: {score}/10</Text>
      <Button
        title="Volver a jugar"
        onPress={handleRestartGame}
        accessibilityLabel="Volver a jugar"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  score: {
    fontSize: 20,
    marginBottom: 20,
  },
});