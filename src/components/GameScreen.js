import React, { useState, useEffect } from 'react';
import { initializeGame } from '../utils/gameUtils';
import questions from '../data/questions.json';

const GameScreen = ({ onGameStart }) => {
  const [gameQuestions, setGameQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const newGameQuestions = initializeGame(questions);
    setGameQuestions(newGameQuestions);
  }, []);

  const handleStartGame = () => {
    const newGameQuestions = initializeGame(questions);
    setGameQuestions(newGameQuestions);
    setCurrentQuestionIndex(0);
    onGameStart();
  };

  const handleAnswerSelect = (index) => {
    // Handle answer selection logic here
    console.log('Selected answer index:', index);
  };

  return (
    <div>
      {gameQuestions.length > 0 && (
        <div>
          <h2>{gameQuestions[currentQuestionIndex].question}</h2>
          <div>
            {gameQuestions[currentQuestionIndex].answers.map((answer, index) => (
              <button key={index} onClick={() => handleAnswerSelect(index)}>
                {answer.text}
              </button>
            ))}
          </div>
        </div>
      )}
      <button onClick={handleStartGame}>¡Jugar!</button>
    </div>
  );
};

export default GameScreen;