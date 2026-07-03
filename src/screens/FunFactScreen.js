import React, { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { logFunFactViewed } from '../services/analyticsLogger';

export default function FunFactScreen({ fact, questionId, dinoId }) {
  useEffect(() => {
    logFunFactViewed(questionId, dinoId);
  }, [questionId, dinoId]);

  return (
    <View testID="fun-fact-screen">
      <Text>{fact}</Text>
      <Image 
        source={{ uri: `https://example.com/dinos/${dinoId}.png` }}
        testID="fun-fact-image"
      />
    </View>
  );
}