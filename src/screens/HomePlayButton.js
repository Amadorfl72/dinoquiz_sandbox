import { startNewGame } from '../game/startGame.js';

export function createPlayButtonHandler(questionBank, selectQuestions, onGameStart) {
  return function handlePlayClick() {
    const questions = selectQuestions(questionBank);
    const game = startNewGame(questions);
    onGameStart(game);
  };
}
