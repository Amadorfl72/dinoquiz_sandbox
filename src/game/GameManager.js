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
    Telemetry.logReplayClicked(this.currentScore);
    this.startGame('replay');
  }
}