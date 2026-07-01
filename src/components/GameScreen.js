import React, { useState, useEffect } from 'react';
import { selectRandomQuestions, shuffleAnswers } from '../utils/gameUtils';
import questions from '../data/questions.json';

const GameScreen = ({ onGameStart }) => {
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    try {
      const selectedQuestions = selectRandomQuestions(questions, 10);
      setCurrentQuestions(selectedQuestions);
      setCurrentQuestionIndex(0);
      if (selectedQuestions.length > 0) {
        setShuffledAnswers(shuffleAnswers(selectedQuestions[0]));
      }
      onGameStart();
    } catch (error) {
      console.error('Game initialization failed:', error);
      // Handle error state appropriately
    }
  };

  const handleAnswerSelect = (answer) => {
    // Handle answer selection logic here
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      setShuffledAnswers(shuffleAnswers(currentQuestions[nextIndex]));
    } else {
      // Handle game end logic here
    }
  };

  return (
    <div>
      {currentQuestions.length > 0 && currentQuestionIndex < currentQuestions.length ? (
        <div>
          <h2>{currentQuestions[currentQuestionIndex].question}</h2>
          <div>
            {shuffledAnswers.map((answer, index) => (
              <button key={index} onClick={() => handleAnswerSelect(answer)}>
                {answer}
              </button>
            ))}
          </div>
          <button onClick={handleNextQuestion}>Siguiente</button>
        </div>
      ) : (
        <div>No hay preguntas disponibles</div>
      )}
    </div>
  );
};

export default GameScreen;