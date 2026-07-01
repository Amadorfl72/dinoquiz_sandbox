import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './QuestionScreen.css';

const QuestionScreen = ({ question, options, correctAnswer, dinosaurImage, funFact, onAnswerSelected, onNextQuestion }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showFunFact, setShowFunFact] = useState(false);

  const handleAnswerClick = (answer) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    setShowFunFact(true);
    
    // Feedback delay to allow UI to update before sound/animation
    setTimeout(() => {
      onAnswerSelected(correct);
    }, 300);
  };

  const handleNextClick = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFunFact(false);
    onNextQuestion();
  };

  return (
    <div className="question-screen" role="region" aria-label="Question Screen">
      <div className="question-container">
        <h1 className="question-text" aria-live="polite">{question}</h1>
        <img 
          src={dinosaurImage} 
          alt={`Illustration of the dinosaur related to the question: ${question}`} 
          className="dinosaur-image"
        />
      </div>
      
      <div className="options-container">
        {options.map((option, index) => (
          <button
            key={index}
            className={`option-button ${selectedAnswer === option ? (isCorrect ? 'correct' : 'incorrect') : ''} ${selectedAnswer !== null && option === correctAnswer ? 'correct' : ''}`}
            onClick={() => handleAnswerClick(option)}
            disabled={selectedAnswer !== null}
            aria-label={`Option ${index + 1}: ${option}`}
          >
            {option}
          </button>
        ))}
      </div>
      
      {showFunFact && (
        <div className="fun-fact-container" aria-live="polite">
          <p className="fun-fact">{funFact}</p>
          <button 
            className="next-button" 
            onClick={handleNextClick}
            aria-label="Next question"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

QuestionScreen.propTypes = {
  question: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  correctAnswer: PropTypes.string.isRequired,
  dinosaurImage: PropTypes.string.isRequired,
  funFact: PropTypes.string.isRequired,
  onAnswerSelected: PropTypes.func.isRequired,
  onNextQuestion: PropTypes.func.isRequired,
};

export default QuestionScreen;