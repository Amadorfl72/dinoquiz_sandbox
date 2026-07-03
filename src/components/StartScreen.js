import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import dinosaurImage from '../assets/dinosaur.png';

const StartScreen = ({ onStartGame }) => {
  return (
    <View testID="StartScreen" style={styles.container}>
      <Text style={styles.title}>DinoQuiz</Text>
      <Image 
        source={dinosaurImage} 
        style={styles.dinosaurImage}
        accessibilityLabel="Dinosaurio mascota"
        testID="dinosaur-illustration"
      />
      <TouchableOpacity 
        style={styles.playButton}
        onPress={onStartGame}
        testID="play-button"
      >
        <Text style={styles.playButtonText}>¡Jugar!</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  dinosaurImage: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  playButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 32,
    minHeight: 64,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default StartScreen;