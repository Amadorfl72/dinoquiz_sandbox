import React from 'react';
import { View, Text, Button } from 'react-native';
import { loadBestScore } from '../storage/localStorage';

const GameScreen = ({ navigation }) => {
  const bestScore = loadBestScore();

  // Game logic here

  const endGame = (finalScore) => {
    navigation.navigate('Results', {
      currentScore: finalScore,
      bestScore: bestScore
    });
  };

  return (
    <View>
      {/* Game UI */}
      <Button title="End Game" onPress={() => endGame(7)} />
    </View>
  );
};

export default GameScreen;
