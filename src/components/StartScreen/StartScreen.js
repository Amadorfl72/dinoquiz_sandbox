import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import styles from './StartScreen.styles';
import dinosaurImage from '../../assets/dinosaur.png';

export const StartScreen = ({ onStartGame }) => {
  return (
    <View style={styles.container} testID="StartScreen">
      <Text style={styles.title}>DinoQuiz</Text>
      <Image 
        source={dinosaurImage} 
        style={styles.dinosaurImage} 
        accessibilityLabel="Dinosaur mascot illustration"
        testID="dinosaur-image"
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
