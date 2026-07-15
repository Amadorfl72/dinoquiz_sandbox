import { PersistenceService } from '../persistence/persistenceService';

export interface GameResult {
  score: number;
  bestStreakInGame: number;
  bestScoreEver: number;
  bestStreakEver: number;
  isNewBestScore: boolean;
  isNewBestStreak: boolean;
}

const POINTS_PER_CORRECT_ANSWER = 10;

export class QuizEngine {
  private score = 0;
  private currentStreak = 0;
  private bestStreakInGame = 0;
  private questionsAnswered = 0;

  constructor(
    private readonly totalQuestions: number,
    private readonly persistenceService: PersistenceService
  ) {}

  answerQuestion(isCorrect: boolean): void {
    this.questionsAnswered += 1;

    if (isCorrect) {
      this.score += POINTS_PER_CORRECT_ANSWER;
      this.currentStreak += 1;
      this.bestStreakInGame = Math.max(this.bestStreakInGame, this.currentStreak);
    } else {
      this.currentStreak = 0;
    }
  }

  isFinished(): boolean {
    return this.questionsAnswered >= this.totalQuestions;
  }

  finishGame(): GameResult {
    const scoreUpdate = this.persistenceService.updateBestScoreIfHigher(this.score);
    const streakUpdate = this.persistenceService.updateBestStreakIfHigher(this.bestStreakInGame);

    return {
      score: this.score,
      bestStreakInGame: this.bestStreakInGame,
      bestScoreEver: scoreUpdate.newBest,
      bestStreakEver: streakUpdate.newBest,
      isNewBestScore: scoreUpdate.improved,
      isNewBestStreak: streakUpdate.improved,
    };
  }
}
