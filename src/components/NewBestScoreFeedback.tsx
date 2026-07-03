import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NewBestScoreFeedbackProps {
  visible?: boolean;
}

const NewBestScoreFeedback: React.FC<NewBestScoreFeedbackProps> = ({
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container} testID="new-best-score-feedback">
      <Text style={styles.text} accessibilityLabel="Nueva mejor puntuación">
        ¡Nueva mejor puntuación!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    marginVertical: 4,
    alignSelf: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
});

export default NewBestScoreFeedback;
