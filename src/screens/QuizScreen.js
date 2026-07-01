import React, { useState } from 'react';
import { View } from 'react-native';
import QuestionScreen from '../components/QuestionScreen';

const QuizScreen = () => {
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '¿Qué dinosaurio es conocido por sus tres cuernos?',
    options: ['Tyrannosaurus Rex', 'Triceratops', 'Velociraptor'],
    dinosaurImage: require('../assets/triceratops.png'),
  });

  const handleOptionSelect = (option) => {
    console.log('Selected option:', option);
    // Handle option selection logic here
  };

  return (
    <View style={{ flex: 1 }}>
      <QuestionScreen
        question={currentQuestion.question}
        options={currentQuestion.options}
        dinosaurImage={currentQuestion.dinosaurImage}
        onOptionSelect={handleOptionSelect}
      />
    </View>
  );
};

export default QuizScreen;