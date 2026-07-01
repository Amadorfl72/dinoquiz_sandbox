import React from 'react';
import { View, Text } from 'react-native';
import { setBestScore } from '../utils/storage';

const GameScreen = ({ navigation }) => {
  // ... existing game logic ...

  const handleGameCompletion = (finalScore) => {
    setBestScore(finalScore);
    navigation.navigate('Results', { currentScore: finalScore });
  };

  // ... rest of the component ...
};

export default GameScreen;