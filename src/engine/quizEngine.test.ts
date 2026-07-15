import { describe, it, expect, beforeEach } from 'vitest';
import { QuizEngine } from './quizEngine';
import { PersistenceService } from '../persistence/persistenceService';
import { StorageAdapter } from '../persistence/StorageAdapter';

class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function playGame(engine: QuizEngine, correctAnswerSequence: boolean[]): void {
  correctAnswerSequence.forEach((isCorrect) => engine.answerQuestion(isCorrect));
}

describe('QuizEngine + PersistenceService integration', () => {
  let storage: InMemoryStorageAdapter;
  let persistenceService: PersistenceService;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    persistenceService = new PersistenceService(storage);
  });

  it('updates the best streak when the current game beats the saved streak (4 -> 6)', () => {
    storage.setItem('dinoquiz.bestStreak', '4');

    const engine = new QuizEngine(6, persistenceService);
    playGame(engine, [true, true, true, true, true, true]);

    const result = engine.finishGame();

    expect(result.bestStreakInGame).toBe(6);
    expect(result.isNewBestStreak).toBe(true);
    expect(result.bestStreakEver).toBe(6);
    expect(persistenceService.getBestStreak()).toBe(6);
  });

  it('keeps the saved streak when the current game does not beat it', () => {
    storage.setItem('dinoquiz.bestStreak', '4');

    const engine = new QuizEngine(10, persistenceService);
    playGame(engine, [true, true, false, true, true, false, true, false, false, false]);

    const result = engine.finishGame();

    expect(result.bestStreakInGame).toBe(2);
    expect(result.isNewBestStreak).toBe(false);
    expect(result.bestStreakEver).toBe(4);
    expect(persistenceService.getBestStreak()).toBe(4);
  });

  it('updates the best score when the current game score is higher than the saved one', () => {
    storage.setItem('dinoquiz.bestScore', '50');

    const engine = new QuizEngine(10, persistenceService);
    playGame(engine, Array(10).fill(true));

    const result = engine.finishGame();

    expect(result.score).toBe(100);
    expect(result.isNewBestScore).toBe(true);
    expect(result.bestScoreEver).toBe(100);
  });

  it('keeps the saved score when the current game score does not beat it', () => {
    storage.setItem('dinoquiz.bestScore', '100');

    const engine = new QuizEngine(10, persistenceService);
    playGame(engine, Array(5).fill(true).concat(Array(5).fill(false)));

    const result = engine.finishGame();

    expect(result.score).toBe(50);
    expect(result.isNewBestScore).toBe(false);
    expect(result.bestScoreEver).toBe(100);
  });
});
