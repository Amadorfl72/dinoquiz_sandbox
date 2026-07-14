const STORAGE_KEYS = {
  bestScore: 'dinoquiz:bestScore',
  maxStreak: 'dinoquiz:maxStreak',
} as const;

export interface GameResult {
  score: number;
  maxStreak: number;
}

export interface RecordGameResultOutcome {
  bestScore: number;
  maxStreak: number;
  isNewBestScore: boolean;
  isNewMaxStreak: boolean;
}

/**
 * DinoQuiz plays fully offline, so localStorage is enough for two scalar
 * numbers. Private-browsing modes and quota errors can make it throw, so
 * every access is guarded and falls back to "no history" instead of
 * crashing the results screen.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const probeKey = '__dinoquiz_storage_probe__';
    window.localStorage.setItem(probeKey, probeKey);
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function readNumber(key: string): number {
  const storage = getStorage();
  if (!storage) return 0;

  try {
    const raw = storage.getItem(key);
    if (raw === null) return 0;

    const parsed = JSON.parse(raw);
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore write failures (e.g. private mode, quota exceeded) - the
    // session can still continue, it just won't persist this result.
  }
}

export function getBestScore(): number {
  return readNumber(STORAGE_KEYS.bestScore);
}

export function getMaxStreak(): number {
  return readNumber(STORAGE_KEYS.maxStreak);
}

/**
 * Call this once a game finishes. Compares the round's score and max
 * streak against the previously stored values and only overwrites the
 * ones that were actually beaten.
 */
export function recordGameResult(result: GameResult): RecordGameResultOutcome {
  const previousBestScore = getBestScore();
  const previousMaxStreak = getMaxStreak();

  const isNewBestScore = result.score > previousBestScore;
  const isNewMaxStreak = result.maxStreak > previousMaxStreak;

  const bestScore = isNewBestScore ? result.score : previousBestScore;
  const maxStreak = isNewMaxStreak ? result.maxStreak : previousMaxStreak;

  if (isNewBestScore) writeNumber(STORAGE_KEYS.bestScore, bestScore);
  if (isNewMaxStreak) writeNumber(STORAGE_KEYS.maxStreak, maxStreak);

  return { bestScore, maxStreak, isNewBestScore, isNewMaxStreak };
}
