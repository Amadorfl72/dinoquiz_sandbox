import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function QuestionScreen({ route }) {
  const navigation = useNavigation();
  const { questionIndex } = route.params;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Mock data - replace with actual question data
  const question = {
    id: 1,
    text: '¿Qué dinosaurio tenía tres cuernos?',
    options: ['T-Rex', 'Triceratops', 'Velociraptor', 'Estegosaurio'],
    correctAnswer: 'Triceratops',
    fact: {
      text: 'El Triceratops usaba sus cuernos para defenderse de depredadores como el T-Rex.',
      image: 'triceratops_image_url'
    },
    dinosaurImage: 'dinosaur_image_url'
  };
  
  const isLastQuestion = questionIndex === 9; // Assuming 10 questions per game
  const nextQuestionIndex = questionIndex + 1;

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    // Navigate to Fun Fact screen after a short delay
    setTimeout(() => {
      navigation.navigate('FunFact', {
        fact: question.fact,
        isLastQuestion,
        nextQuestionIndex
      });
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.text}</Text>
      <Image source={{ uri: question.dinosaurImage }} style={styles.dinosaurImage} />
      
      {question.options.map((option, index) => (
        <TouchableOpacity 
          key={index}
          style={[
            styles.optionButton, 
            showFeedback && option === question.correctAnswer && styles.correctOption,
            showFeedback && selectedAnswer === option && option !== question.correctAnswer && styles.incorrectOption
          ]}
          onPress={() => !showFeedback && handleAnswerSelect(option)}
          disabled={showFeedback}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}
      
      {showFeedback && (
        <Text style={styles.feedbackText}>
          {selectedAnswer === question.correctAnswer 
            ? '¡Correcto!'
            : `La respuesta correcta es: ${question.correctAnswer}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  dinosaurImage: {
    width: 200,
    height: 200,
    marginBottom: 30,
    borderRadius: 10,
  },
  optionButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  correctOption: {
    backgroundColor: '#a5d6a7',
  },
  incorrectOption: {
    backgroundColor: '#ef9a9a',
  },
  optionText: {
    fontSize: 18,
    color: '#333',
  },
  feedbackText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});