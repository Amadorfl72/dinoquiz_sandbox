const BestScoreManager = require('./bestScore');

class Game {
  constructor() {
    this.bestScoreManager = new BestScoreManager();
    this.bestScore = this.bestScoreManager.getBestScore();
  }
}

module.exports = Game;
