import React, { useEffect } from 'react';
import StartScreen from './components/StartScreen';
import QuizScreen from './components/QuizScreen';
import sessionService from './services/sessionService';

const App = () => {
  const [gameState, setGameState] = React.useState('start');

  useEffect(() => {
    sessionService.resetGame();
  }, []);

  const handleStartGame = () => {
    setGameState('quiz');
  };

  return (
    <div>
      {gameState === 'start' && <StartScreen onStartGame={handleStartGame} />}
      {gameState === 'quiz' && <QuizScreen />}
    </div>
  );
};

export default App;