import React from 'react';
import { View, Image, TouchableOpacity, Text } from 'react-native';
import styles from './HomeScreen.styles';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DinoQuiz</Text>
      
      <Image
        id="dino_mascot"
        source={require('../assets/dino_mascot.png')}
        style={styles.mascot}
        accessibilityLabel="Dino, el dinosaurio mascota de DinoQuiz"
      />
      
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => navigation.navigate('Quiz')}
        accessible={true}
        accessibilityLabel="Jugar"
        focusable={true}
      >
        <Text style={styles.playButtonText}>¡Jugar!</Text>
      </TouchableOpacity>
    </View>
  );
}