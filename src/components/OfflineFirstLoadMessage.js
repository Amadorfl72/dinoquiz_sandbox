import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OfflineFirstLoadMessage = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>Conéctate la primera vez para descargar el juego</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  message: {
    fontSize: 20,
    textAlign: 'center',
    margin: 20,
  },
});

export default OfflineFirstLoadMessage;