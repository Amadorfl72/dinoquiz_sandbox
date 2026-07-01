import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const StartScreen = ({ onStartGame }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DinoQuiz</Text>
      <Image
        source={require('../assets/dinosaur.png')}
        style={styles.dinosaurImage}
        accessibilityLabel="Illustration of a friendly dinosaur"
      />
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
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2e8b57',
    marginBottom: 32,
  },
  dinosaurImage: {
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  playButton: {
    backgroundColor: '#ff7f50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minHeight: 64, // 64dp
  },
  playButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default StartScreen;