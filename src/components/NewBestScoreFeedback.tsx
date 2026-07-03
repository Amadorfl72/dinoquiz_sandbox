import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NewBestScoreFeedback = () => (
  <View style={styles.container}>
    <Text style={styles.text}>¡Nueva mejor puntuación!</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NewBestScoreFeedback;