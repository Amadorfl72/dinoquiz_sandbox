import React, { createContext, useCallback, useContext, useState } from 'react';
import { useGameState } from '../hooks/useGameState';

const GameContext = createContext(null);

export const GameProvider = ({ children, initialScreen = 'playing' }) => {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const gameState = useGameState();

  const resetGameState = useCallback(() => {
    gameState.resetGameState();
    setCurrentScreen('playing');
  }, [gameState]);

  const startNewRound = useCallback(() => {
    gameState.startNewRound();
    setCurrentScreen('playing');
  }, [gameState]);

  const finishRound = useCallback(() => {
    setCurrentScreen('results');
  }, []);

  const value = {
    ...gameState,
    currentScreen,
    resetGameState,
    startNewRound,
    finishRound,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
