import React from 'react';
import { useNavigate } from 'react-router-dom';
import questions from '../data/questions.json';
import SessionService from '../services/SessionService';

function HomeScreen() {
  const navigate = useNavigate();

  const handleStartGame = () => {
    SessionService.startNewGame(questions);
    navigate('/quiz');
  };

  return (
    <div className="home-screen">
      <h1>DinoQuiz</h1>
      <button 
        onClick={handleStartGame}
        style={{
          fontSize: '24px',
          minHeight: '64px',
          minWidth: '48px'
        }}
      >
        ¡Jugar!
      </button>
    </div>
  );
}

export default HomeScreen;