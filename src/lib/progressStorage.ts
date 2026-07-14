export interface ProgressState {
  seenFactIds: string[];
  bestScore: number;
  maxStreak: number;
}

const STORAGE_KEY = 'dinoquiz:progress:v1';

const DEFAULT_STATE: ProgressState = {
  seenFactIds: [],
  bestScore: 0,
  maxStreak: 0,
};

function isValidState(value: unknown): value is ProgressState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.seenFactIds) &&
    candidate.seenFactIds.every((id) => typeof id === 'string') &&
    typeof candidate.bestScore === 'number' &&
    typeof candidate.maxStreak === 'number'
  );
}

// No in-memory cache on purpose: every call reads localStorage directly so
// state stays correct across multiple tabs/instances of the PWA.
function readState(): ProgressState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(state: ProgressState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private browsing, quota exceeded, disabled). The
    // caller already has the updated value for this session; nothing else to do.
  }
}

export function getProgress(): ProgressState {
  return readState();
}

export function getDiscoveredCount(): number {
  return readState().seenFactIds.length;
}

export function markFactSeen(factId: string): ProgressState {
  const current = readState();
  if (current.seenFactIds.includes(factId)) {
    return current;
  }
  const next: ProgressState = {
    ...current,
    seenFactIds: [...current.seenFactIds, factId],
  };
  writeState(next);
  return next;
}

export function recordGameResult(result: { score: number; streak: number }): ProgressState {
  const current = readState();
  const next: ProgressState = {
    ...current,
    bestScore: Math.max(current.bestScore, result.score),
    maxStreak: Math.max(current.maxStreak, result.streak),
  };
  writeState(next);
  return next;
}
