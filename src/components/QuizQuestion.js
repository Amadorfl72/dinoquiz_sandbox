import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuizQuestion.css';

export default function QuizQuestion({ question, options, correctAnswer, funFact, image, onAnswer }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const navigate = useNavigate();

  const handleOptionClick = (option) => {
    if (selectedOption !== null) return; // Prevent multiple selections
    
    setSelectedOption(option);
    const correct = option === correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      onAnswer(true);
    }
    
    // Transition to fun fact screen after a delay
    setTimeout(() => {
      navigate('/fun-fact', { state: { funFact, image } });
    }, 3000);
  };

  const getOptionClass = (option) => {
    if (!showFeedback) return '';
    if (option === correctAnswer) return 'correct';
    if (option === selectedOption && !isCorrect) return 'incorrect';
    return '';
  };

  return (
    <div className="quiz-question">
      <h2>{question}</h2>
      <img src={image} alt="Dinosaur" />
      <div className="options">
        {options.map((option, index) => (
          <button
            key={index}
            className={`option ${getOptionClass(option)}`}
            onClick={() => handleOptionClick(option)}
            disabled={showFeedback}
            aria-label={option === correctAnswer && showFeedback ? "correct answer" : option === selectedOption && !isCorrect ? "incorrect answer" : option}
            data-testid={`option-${index}`}
          >
            {option}
          </button>
        ))}
      </div>
      {showFeedback && !isCorrect && (
        <div className="feedback-message" data-testid="incorrect-feedback-message">
          <p>¡Buen intento! La respuesta correcta es {correctAnswer}. ¡Sigue aprendiendo!</p>
        </div>
      )}
    </div>
  );
}