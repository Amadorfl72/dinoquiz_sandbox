import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { logEvent } from '../services/analytics';

type FunFactScreenProps = {
  route: {
    params: {
      funFact: string;
      dinosaurName: string;
    };
  };
};

const FunFactScreen: React.FC<FunFactScreenProps> = ({ route }) => {
  const { funFact, dinosaurName } = route.params;

  useEffect(() => {
    logEvent('fun_fact_viewed', {
      dinosaur_name: dinosaurName,
    });
  }, [dinosaurName]);

  return (
    <View>
      <Text>{funFact}</Text>
    </View>
  );
};

export default FunFactScreen;