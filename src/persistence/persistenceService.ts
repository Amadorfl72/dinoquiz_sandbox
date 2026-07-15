import { StorageAdapter, LocalStorageAdapter } from './StorageAdapter';

const BEST_SCORE_KEY = 'dinoquiz.bestScore';
const BEST_STREAK_KEY = 'dinoquiz.bestStreak';

export interface ScoreUpdateResult {
  previousBest: number;
  newBest: number;
  improved: boolean;
}

export class PersistenceService {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter = new LocalStorageAdapter()) {
    this.storage = storage;
  }

  getBestScore(): number {
    return this.readNumber(BEST_SCORE_KEY);
  }

  getBestStreak(): number {
    return this.readNumber(BEST_STREAK_KEY);
  }

  updateBestScoreIfHigher(currentScore: number): ScoreUpdateResult {
    return this.updateIfHigher(BEST_SCORE_KEY, currentScore);
  }

  updateBestStreakIfHigher(currentStreak: number): ScoreUpdateResult {
    return this.updateIfHigher(BEST_STREAK_KEY, currentStreak);
  }

  private updateIfHigher(key: string, currentValue: number): ScoreUpdateResult {
    const previousBest = this.readNumber(key);

    if (currentValue > previousBest) {
      this.storage.setItem(key, String(currentValue));
      return { previousBest, newBest: currentValue, improved: true };
    }

    return { previousBest, newBest: previousBest, improved: false };
  }

  private readNumber(key: string): number {
    const raw = this.storage.getItem(key);

    if (raw === null) {
      return 0;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
