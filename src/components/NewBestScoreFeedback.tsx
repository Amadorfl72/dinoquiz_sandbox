import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import strings from '../strings.json';

interface NewBestScoreFeedbackProps {
  isNewBestScore: boolean;
}

const NewBestScoreFeedback: React.FC<NewBestScoreFeedbackProps> = ({ isNewBestScore }) => {
  useEffect(() => {
    if (!isNewBestScore) return;
    
    const timer = setTimeout(() => {
      // Component will unmount after timeout
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isNewBestScore]);

  if (!isNewBestScore) return null;

  return (
    <View style={styles.container} testID="new-best-score-feedback">
      <Text style={styles.text}>{strings.es.newBestScore}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
});

export default NewBestScoreFeedback;