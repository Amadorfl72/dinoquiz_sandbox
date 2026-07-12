import { trackReplayPulsado } from '../analytics/gameEvents.js';
import { startNewGame } from '../game/startGame.js';

export function createReplayButtonHandler(questionBank, selectQuestions, onGameStart) {
  return function handleReplayClick() {
    trackReplayPulsado();
    const questions = selectQuestions(questionBank);
    const game = startNewGame(questions);
    onGameStart(game);
  };
}
