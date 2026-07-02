import React, { useEffect, useState } from 'react';
import { checkOfflineFirstLoad } from './utils/offlineFirstLoad';
import OfflineFirstLoadMessage from './components/OfflineFirstLoadMessage';
import StartScreen from './components/StartScreen';
import QuizScreen from './components/QuizScreen';
import sessionService from './services/sessionService';

const App = () => {
  const [gameState, setGameState] = useState('start');
  const [isOfflineFirstLoad, setIsOfflineFirstLoad] = useState(false);

  useEffect(() => {
    setIsOfflineFirstLoad(checkOfflineFirstLoad());
    sessionService.resetGame();
  }, []);

  const handleStartGame = () => {
    setGameState('quiz');
  };

  if (isOfflineFirstLoad) {
    return <OfflineFirstLoadMessage />;
  }

  return (
    <div>
      {gameState === 'start' && <StartScreen onStartGame={handleStartGame} />}
      {gameState === 'quiz' && <QuizScreen />}
    </div>
  );
};

export default App;
