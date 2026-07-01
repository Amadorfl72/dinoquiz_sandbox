import React from 'react';
import { View, Text } from 'react-native';
import { setBestScore } from '../utils/storage';

const GameScreen = ({ navigation }) => {
  // ... existing game logic ...

  const handleGameCompletion = async (finalScore) => {
    try {
      await setBestScore(finalScore);
    } catch (error) {
      console.error('Failed to save best score:', error);
    }
    navigation.navigate('Results', { currentScore: finalScore });
  };

  // ... rest of the component ...
};

export default GameScreen;