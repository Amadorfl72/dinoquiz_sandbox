import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { logger } from '../services/logger';

type FunFactScreenProps = {
  route: {
    params: {
      funFact: string;
      dinosaurName: string;
      factId: string;
    };
  };
};

const FunFactScreen: React.FC<FunFactScreenProps> = ({ route }) => {
  const { funFact, dinosaurName, factId } = route.params;

  useEffect(() => {
    logger.log('fun_fact_viewed', {
      dinosaur_name: dinosaurName,
      fact_id: factId
    });
  }, [dinosaurName, factId]);

  return (
    <View>
      <Text>{funFact}</Text>
    </View>
  );
};

export default FunFactScreen;