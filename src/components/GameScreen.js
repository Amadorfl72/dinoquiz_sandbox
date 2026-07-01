import React, { useState, useEffect } from 'react';
import { selectRandomQuestions } from '../utils/gameUtils';
import questions from '../data/questions.json';

const GameScreen = ({ onGameStart }) => {
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    try {
      const selectedQuestions = selectRandomQuestions(questions, 10);
      setCurrentQuestions(selectedQuestions);
      setCurrentQuestionIndex(0);
      setError(null);
      onGameStart();
    } catch (err) {
      console.error('Game initialization failed:', err);
      setError('No se pudieron cargar las preguntas. Inténtalo de nuevo.');
    }
  };

  const handleAnswerSelect = (answer) => {
    // Handle answer selection logic here
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      // Handle game end logic here
    }
  };

  return (
    <div>
      {error ? (
        <div className="error-message">{error}</div>
      ) : currentQuestions.length > 0 && currentQuestionIndex < currentQuestions.length ? (
        <div>
          <h2>{currentQuestions[currentQuestionIndex].question}</h2>
          <div>
            {currentQuestions[currentQuestionIndex].options.map((answer, index) => (
              <button 
                key={index} 
                onClick={() => handleAnswerSelect(answer)}
                className="answer-button"
              >
                {answer}
              </button>
            ))}
          </div>
          <button onClick={handleNextQuestion} className="next-button">
            Siguiente
          </button>
        </div>
      ) : (
        <div>No hay preguntas disponibles</div>
      )}
    </div>
  );
};

export default GameScreen;