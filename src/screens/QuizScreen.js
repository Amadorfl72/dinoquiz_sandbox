import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionService from '../services/SessionService';

function QuizScreen() {
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  
  const currentQuestion = SessionService.getCurrentQuestion();

  const handleAnswer = (selectedOption) => {
    const correct = selectedOption === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setFeedbackMessage(correct ? '¡Correcto!' : `La respuesta correcta es: ${currentQuestion.correctAnswer}`);
    setShowFeedback(true);
    
    setTimeout(() => {
      const result = SessionService.submitAnswer(correct);
      if (result.isGameOver) {
        navigate('/results', { state: { score: result.score } });
      } else {
        setShowFeedback(false);
      }
    }, 4000);
  };

  if (!currentQuestion) {
    navigate('/');
    return null;
  }

  return (
    <div className="quiz-screen">
      <h2>{currentQuestion.question}</h2>
      <img src={currentQuestion.image} alt={currentQuestion.dinosaur} />
      
      {currentQuestion.options.map((option, index) => (
        <button 
          key={index} 
          onClick={() => handleAnswer(option)}
          disabled={showFeedback}
        >
          {option}
        </button>
      ))}
      
      {showFeedback && (
        <div className="feedback">
          <p>{feedbackMessage}</p>
          <p>{currentQuestion.funFact}</p>
        </div>
      )}
    </div>
  );
}

export default QuizScreen;