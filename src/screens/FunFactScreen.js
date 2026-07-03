import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { logFunFactViewed } from '../services/analyticsLogger';

const FunFactScreen = ({ fact, questionId, dinoId }) => {
  useEffect(() => {
    logFunFactViewed(questionId, dinoId);
  }, [questionId, dinoId]);

  return (
    <View testID="fun-fact-screen">
      <Text>{fact}</Text>
    </View>
  );
};

export default FunFactScreen;