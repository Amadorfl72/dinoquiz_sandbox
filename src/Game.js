import React, { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import ResultsScreen from './components/ResultsScreen';

const GameScreen = () => {
  const { currentScreen, currentQuestion, score, startNewRound, finishRound } = useGame();

  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <button
        type="button"
        data-testid="finish-round-hook"
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: 'none' }}
        onClick={finishRound}
      />
      {currentScreen === 'results' ? (
        <ResultsScreen score={score} />
      ) : (
        <div data-testid="current-question-text">{currentQuestion?.text}</div>
      )}
    </div>
  );
};

export const Game = () => (
  <GameProvider>
    <GameScreen />
  </GameProvider>
);

export default Game;
