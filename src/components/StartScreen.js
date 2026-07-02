import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import dinosaurIllustration from '../assets/dinosaur.png';

const StartScreen = ({ onStartGame }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DinoQuiz</Text>
      <Image source={dinosaurIllustration} style={styles.dinosaurImage} />
      <TouchableOpacity style={styles.playButton} onPress={onStartGame}>
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
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 32,
  },
  dinosaurImage: {
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  playButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minHeight: 64,
    justifyContent: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default StartScreen;