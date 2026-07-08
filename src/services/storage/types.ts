export interface DinoQuizPersistedState {
  bestScore: number;
  maxStreak: number;
  discoveredFunFacts: string[];
  muted: boolean;
}

export const DEFAULT_STATE: DinoQuizPersistedState = {
  bestScore: 0,
  maxStreak: 0,
  discoveredFunFacts: [],
  muted: false,
};

export type StorageKey = keyof DinoQuizPersistedState;

export type StorageBackendName = 'indexedDB' | 'localStorage' | 'memory';

export interface StorageAdapter {
  readonly name: StorageBackendName;
  isAvailable(): Promise<boolean>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Aggregated, non-PII diagnostics only: no user identifiers, no stack traces.
export interface StorageDiagnostics {
  backend: StorageBackendName;
  isPersistent: boolean;
  failureCount: number;
  lastErrorAt: number | null;
}

export type Unsubscribe = () => void;

export type Listener<K extends StorageKey> = (value: DinoQuizPersistedState[K]) => void;
