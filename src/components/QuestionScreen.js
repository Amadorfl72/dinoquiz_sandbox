import React, { useState, useEffect } from 'react';
import { logQuestionAnswered } from '../utils/analytics';
import { calculateHitPercentage } from '../utils/metrics';

const QuestionScreen = ({ question, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [hitPercentage, setHitPercentage] = useState(null);
  
  useEffect(() => {
    setStartTime(Date.now());
    
    // Load historical hit percentage for this question
    const loadHitPercentage = async () => {
      const percentage = await calculateHitPercentage(question.id);
      setHitPercentage(percentage);
    };
    
    loadHitPercentage();
  }, [question.id]);
  
  const handleAnswer = (option) => {
    if (isAnswered) return;
    
    const isHit = option === question.correctAnswer;
    const responseTimeMs = Date.now() - startTime;
    
    setSelectedOption(option);
    setIsAnswered(true);
    
    // Log the answer event
    logQuestionAnswered(question.id, isHit, responseTimeMs);
    
    // Call parent handler after a delay to show feedback
    setTimeout(() => onAnswer(isHit), 2000);
  };
  
  return (
    <div className="question-screen">
      <h2>{question.text}</h2>
      <img src={question.image} alt={question.dinosaurName} />
      
      <div className="options">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option)}
            disabled={isAnswered}
            className={`
              ${isAnswered && option === question.correctAnswer ? 'correct' : ''}
              ${isAnswered && option === selectedOption && !question.correctAnswer ? 'incorrect' : ''}
            `}
          >
            {option}
          </button>
        ))}
      </div>
      
      {isAnswered && (
        <div className="feedback">
          <p>{question.funFact}</p>
        </div>
      )}
      
      {hitPercentage !== null && (
        <div className="metrics">
          <small>Players got this right {hitPercentage.toFixed(1)}% of the time</small>
        </div>
      )}
    </div>
  );
};

export default QuestionScreen;