import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';

const ResultsScreen = ({ route }) => {
  const { score, previousBestScore } = route.params;
  const [showNewBestScore, setShowNewBestScore] = useState(false);

  useEffect(() => {
    if (score > previousBestScore) {
      setShowNewBestScore(true);
      Toast.show({
        type: 'success',
        text1: '¡Nueva mejor puntuación!',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
    }
  }, [score, previousBestScore]);

  return (
    <View style={styles.container}>
      <Text style={styles.scoreText}>Tu puntuación: {score}/10</Text>
      {/* Rest of the results screen UI */}
      <Toast ref={(ref) => Toast.setRef(ref)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default ResultsScreen;