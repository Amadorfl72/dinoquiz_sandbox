import { describe, it, expect, beforeEach } from 'vitest';
import { PersistenceService } from './persistenceService';
import { StorageAdapter } from './StorageAdapter';

class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('PersistenceService', () => {
  let storage: InMemoryStorageAdapter;
  let service: PersistenceService;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    service = new PersistenceService(storage);
  });

  it('returns 0 as default best score and streak when nothing is stored', () => {
    expect(service.getBestScore()).toBe(0);
    expect(service.getBestStreak()).toBe(0);
  });

  it('persists a new best score when it is higher than the saved one', () => {
    storage.setItem('dinoquiz.bestScore', '30');

    const result = service.updateBestScoreIfHigher(45);

    expect(result).toEqual({ previousBest: 30, newBest: 45, improved: true });
    expect(service.getBestScore()).toBe(45);
  });

  it('does not persist a score when it does not beat the saved one', () => {
    storage.setItem('dinoquiz.bestScore', '30');

    const result = service.updateBestScoreIfHigher(20);

    expect(result).toEqual({ previousBest: 30, newBest: 30, improved: false });
    expect(service.getBestScore()).toBe(30);
  });

  it('persists a new best streak when the current one beats the saved one (4 -> 6)', () => {
    storage.setItem('dinoquiz.bestStreak', '4');

    const result = service.updateBestStreakIfHigher(6);

    expect(result).toEqual({ previousBest: 4, newBest: 6, improved: true });
    expect(service.getBestStreak()).toBe(6);
  });

  it('does not persist a streak that does not beat the saved one', () => {
    storage.setItem('dinoquiz.bestStreak', '4');

    const result = service.updateBestStreakIfHigher(3);

    expect(result).toEqual({ previousBest: 4, newBest: 4, improved: false });
    expect(service.getBestStreak()).toBe(4);
  });
});
