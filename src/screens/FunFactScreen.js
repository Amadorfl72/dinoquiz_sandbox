import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { logEvent } from '../services/analytics';

const FunFactScreen = ({ route }) => {
  const { funFact } = route.params;

  useEffect(() => {
    logEvent('fun_fact_viewed', { fact_id: funFact.id });
  }, [funFact.id]);

  return (
    <View>
      <Text>{funFact.text}</Text>
    </View>
  );
};

export default FunFactScreen;