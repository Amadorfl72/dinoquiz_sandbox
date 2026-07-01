import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import happySound from '../assets/sounds/happy.mp3';
import './QuizQuestion.css';

const QuizQuestion = ({ question, onAnswerSelected }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFunFact, setShowFunFact] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const navigation = useNavigation();
  const happyAudio = new Audio(happySound);

  const handleOptionClick = (option) => {
    if (selectedOption !== null) return;
    
    setSelectedOption(option);
    const correct = option === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      happyAudio.play();
      setShowAnimation(true);
      setTimeout(() => {
        setShowFunFact(true);
        navigation.navigate('FunFact', { funFact: question.funFact });
      }, 1000);
    }
    
    onAnswerSelected(correct);
  };

  const handleNext = () => {
    navigation.navigate('FunFact', { funFact: question.funFact });
  };

  return (
    <div className="quiz-question">
      <h2>{question.text}</h2>
      <img src={question.image} alt={question.dinosaurName} />
      <div className="options">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick(option)}
            className={`option ${selectedOption === option ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
            disabled={selectedOption !== null}
          >
            {option}
          </button>
        ))}
      </div>
      
      {showFeedback && (
        <div className={`feedback ${isCorrect ? 'happy' : 'neutral'}``}
          {isCorrect ? '¡Correcto! 🎉' : `La respuesta correcta es: ${question.correctAnswer}`}
        </div>
      )}
      
      {showAnimation && isCorrect && (
        <div className="positive-animation" data-testid="positive-animation">
          {/* Animation would be rendered here */}
          <span role="img" aria-label="celebration">🎉</span>
        </div>
      )}
      
      {showFunFact && (
        <div className="fun-fact-preview">
          <p>{question.funFact}</p>
          <button onClick={handleNext}>Siguiente</button>
        </div>
      )}
    </div>
  );
};

export default QuizQuestion;