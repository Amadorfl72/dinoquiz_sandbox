import React from 'react';
import { ResultsScreen } from './ResultsScreen';
import { gameStore } from '../../state/gameStore';
import { navigationStore } from '../../navigation/navigationStore';

export interface ResultsScreenContainerProps {
  score: number;
  totalQuestions: number;
}

export function ResultsScreenContainer({
  score,
  totalQuestions,
}: ResultsScreenContainerProps) {
  const handlePlayAgain = (): void => {
    gameStore.resetGame();
    navigationStore.goToQuiz();
  };

  const handleExit = (): void => {
    navigationStore.goToHome();
  };

  return (
    <ResultsScreen
      score={score}
      totalQuestions={totalQuestions}
      onPlayAgain={handlePlayAgain}
      onExit={handleExit}
    />
  );
}
