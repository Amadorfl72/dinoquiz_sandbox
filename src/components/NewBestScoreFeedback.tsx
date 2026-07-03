import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type NewBestScoreFeedbackProps = {
  visible: boolean;
};

const NewBestScoreFeedback = ({ visible }: NewBestScoreFeedbackProps) => {
  if (!visible) return null;

  return (
    <View style={styles.container} accessible={true} accessibilityLabel="¡Nueva mejor puntuación!">
      <Text style={styles.text}>¡Nueva mejor puntuación!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});

export default NewBestScoreFeedback;