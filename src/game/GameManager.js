import { Telemetry } from '../analytics/telemetry';

export class GameManager {
  constructor() {
    this.currentScore = 0;
  }

  startGame(trigger) {
    Telemetry.logGameStarted(trigger);
    // Rest of game start logic
  }

  endGame() {
    // Game end logic
  }

  replayGame() {
    // Only log the game started event with replay trigger
    // This avoids duplicate events and correctly measures replay rate
    this.startGame('replay');
  }
}