import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import dinoMascot from '../assets/images/dino-placeholder.png';
import sessionService from '../services/sessionService';

const PLAY_BUTTON_MIN_HEIGHT = 64;

export default function HomeScreen({ onStartGame, navigation }) {
  const handleStartGame = () => {
    sessionService.resetGame();

    if (onStartGame) {
      onStartGame();
    } else if (navigation) {
      navigation.navigate('Question', { questionIndex: 0 });
    }
  };

  return (
    <View style={styles.container} testID="start-screen">
      <Text style={styles.title}>DinoQuiz</Text>
      <Image
        source={dinoMascot}
        style={styles.mascotImage}
        accessibilityLabel="Dino, la mascota de DinoQuiz"
        testID="dino-mascot"
      />
      <TouchableOpacity
        style={styles.playButton}
        onPress={handleStartGame}
        accessibilityRole="button"
        accessibilityLabel="¡Jugar!"
        testID="start-game-button"
      >
        <Text style={styles.playButtonText}>¡Jugar!</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  mascotImage: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  playButton: {
    backgroundColor: '#4CAF50',
    minHeight: PLAY_BUTTON_MIN_HEIGHT,
    minWidth: 200,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
