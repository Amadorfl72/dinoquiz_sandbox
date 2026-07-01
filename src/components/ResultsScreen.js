import React from 'react';
import { View, Text, Button } from 'react-native';
import { compareScores, updateBestScore, getStars } from '../utils/scoreUtils';
import { saveBestScore } from '../storage/localStorage';

const ResultsScreen = ({ route, navigation }) => {
  const { currentScore, bestScore } = route.params;
  const isNewBest = compareScores(currentScore, bestScore);
  const updatedBestScore = updateBestScore(currentScore, bestScore);
  const stars = getStars(currentScore);

  saveBestScore(updatedBestScore);

  return (
    <View>
      <Text>Your Score: {currentScore}/10</Text>
      <Text>Best Score: {updatedBestScore}/10</Text>
      <Text>Stars: {'⭐'.repeat(stars)}</Text>
      {isNewBest && <Text>New Best Score! 🎉</Text>}
      <Button
        title="Play Again"
        onPress={() => navigation.navigate('Game')}
      />
    </View>
  );
};

export default ResultsScreen;