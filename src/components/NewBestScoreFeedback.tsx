import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import strings from '../strings.json';

interface NewBestScoreFeedbackProps {
  isNewBestScore: boolean;
}

const NewBestScoreFeedback: React.FC<NewBestScoreFeedbackProps> = ({ isNewBestScore }) => {
  const [visible, setVisible] = useState(isNewBestScore);

  useEffect(() => {
    setVisible(isNewBestScore);

    if (!isNewBestScore) return;

    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isNewBestScore]);

  if (!visible) return null;

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