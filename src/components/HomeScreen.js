import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styles } from '../styles/HomeScreenStyles';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container} accessible={true} accessibilityLabel="Pantalla de inicio de DinoQuiz">
      <Text style={styles.title} accessibilityRole="header">DinoQuiz</Text>
      <Image 
        source={require('../assets/dino-mascot.png')} 
        style={styles.mascot} 
        accessibilityLabel="Mascota de DinoQuiz, un dinosaurio amigable"
      />
      <TouchableOpacity 
        style={styles.playButton}
        onPress={() => navigation.navigate('Quiz')}
        accessibilityRole="button"
        accessibilityLabel="Botón para empezar a jugar"
      >
        <Text style={styles.playButtonText}>¡Jugar!</Text>
      </TouchableOpacity>
    </View>
  );
}