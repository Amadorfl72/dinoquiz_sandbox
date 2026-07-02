import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { analyticsLogger } from '../services/analyticsLogger';

const FunFactScreen = ({ route }) => {
  const { funFact } = route.params;

  useEffect(() => {
    analyticsLogger.emit({ 
      event: 'fun_fact_viewed'
    });
  }, [funFact]);

  return (
    <View testID="fun-fact-screen">
      <Text>{funFact.text}</Text>
    </View>
  );
};

export default FunFactScreen;