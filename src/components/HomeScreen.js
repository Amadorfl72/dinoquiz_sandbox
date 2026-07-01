import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styles } from '../styles/HomeScreenStyles';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container} accessible={true} accessibilityLabel="Pantalla de inicio de DinoQuiz">
      <Text style={styles.title} accessibilityRole="header">DinoQuiz</Text>
      <Image 
        id="dino_mascot"
        source={require('../assets/dino-mascot.png')} 
        style={styles.mascot} 
        accessibilityLabel="Mascota de DinoQuiz, un dinosaurio amigable"
        accessibilityRole="image"
        testID="dino_mascot"
      />
      <TouchableOpacity 
        style={styles.playButton}
        onPress={() => navigation.navigate('Quiz')}
        accessibilityRole="button"
        accessibilityLabel="Botón para empezar a jugar"
        accessibilityHint="Presiona para comenzar una nueva partida"
        activeOpacity={0.7}
        focusable={true}
        testID="play_button"
      >
        <Text style={styles.playButtonText} accessibilityRole="text">¡Jugar!</Text>
      </TouchableOpacity>
    </View>
  );
}