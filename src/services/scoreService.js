import logger from '../utils/logger';
import config from '../config';

class ScoreService {
  constructor(storageService) {
    this.storageService = storageService;
    this.bestScore = null;
  }

  async initialize() {
    this.bestScore = await this.storageService.loadBestScore();
  }

  async updateScore(newScore) {
    if (this.bestScore === null || newScore > this.bestScore) {
      const previousBest = this.bestScore;
      this.bestScore = newScore;
      await this.storageService.saveBestScore(newScore);
      
      logger.info('best_score_updated', {
        previous_best: previousBest,
        new_best: newScore,
        app_version: config.appVersion
      });
      
      return true;
    }
    return false;
  }
}

export default ScoreService;