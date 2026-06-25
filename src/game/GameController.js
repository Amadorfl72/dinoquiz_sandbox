// src/game/GameController.js
import { emitGameStarted, emitGameOver, emitReplayClicked } from '../telemetry/events.js';
import { calculateReplayRate } from '../telemetry/metrics.js';

class GameController {
  constructor() {
    this.score = 0;
    this.gameState = 'idle'; // idle, playing, finished
  }

  startGame(isReplay = false) {
    this.gameState = 'playing';
    this.score = 0;
    
    // Emit game started event with appropriate trigger
    emitGameStarted(isReplay ? 'replay' : 'initial');
  }

  finishGame() {
    this.gameState = 'finished';
    emitGameOver(this.score);
  }

  restartGame(previousScore) {
    // Emit replay clicked event with previous score
    const replayClickTime = Date.now();
    emitReplayClicked(previousScore);
    
    // Calculate replay rate metric
    calculateReplayRate(replayClickTime);
    
    // Start new game with replay trigger
    this.startGame(true);
  }

  // Other game logic...
}

export default GameController;