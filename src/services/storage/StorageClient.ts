import { createIndexedDbAdapter } from './adapters/indexedDbAdapter';
import { createLocalStorageAdapter } from './adapters/localStorageAdapter';
import { createMemoryAdapter } from './adapters/memoryAdapter';
import {
  DEFAULT_STATE,
  type DinoQuizPersistedState,
  type Listener,
  type StorageAdapter,
  type StorageDiagnostics,
  type StorageKey,
  type Unsubscribe,
} from './types';

const NAMESPACE = 'dinoquiz:';
const PERSISTED_KEYS: StorageKey[] = ['bestScore', 'maxStreak', 'discoveredFunFacts', 'muted'];

function namespacedKey(key: StorageKey): string {
  return `${NAMESPACE}${key}`;
}

function keyFromNamespaced(namespaced: string): StorageKey | null {
  if (!namespaced.startsWith(NAMESPACE)) {
    return null;
  }
  const key = namespaced.slice(NAMESPACE.length);
  return (PERSISTED_KEYS as string[]).includes(key) ? (key as StorageKey) : null;
}

/**
 * Client-side persistence service for DinoQuiz.
 *
 * Wraps IndexedDB with automatic fallback to localStorage, and finally to an
 * in-memory store if both are unavailable or throw. The game must stay fully
 * playable in that last, degraded mode -- it simply won't remember anything
 * across reloads.
 */
export class DinoQuizStorage {
  private readonly adapters: StorageAdapter[];
  private activeAdapter: StorageAdapter | null = null;
  private cache: DinoQuizPersistedState = { ...DEFAULT_STATE, discoveredFunFacts: [] };
  private readonly listeners = new Map<StorageKey, Set<Listener<StorageKey>>>();
  private initPromise: Promise<void> | null = null;

  // Aggregated, non-PII observability counters only.
  private failureCount = 0;
  private lastErrorAt: number | null = null;

  private readonly handleStorageEvent = (event: StorageEvent): void => {
    if (!event.key) return;
    const key = keyFromNamespaced(event.key);
    if (!key) return;

    try {
      const value = event.newValue !== null ? JSON.parse(event.newValue) : DEFAULT_STATE[key];
      this.cache = { ...this.cache, [key]: value };
      this.notify(key, value as DinoQuizPersistedState[StorageKey]);
    } catch {
      this.recordFailure();
    }
  };

  constructor(
    adapters: StorageAdapter[] = [createIndexedDbAdapter(), createLocalStorageAdapter(), createMemoryAdapter()],
  ) {
    this.adapters = adapters;
  }

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    for (const adapter of this.adapters) {
      try {
        if (await adapter.isAvailable()) {
          this.activeAdapter = adapter;
          break;
        }
      } catch {
        this.recordFailure();
      }
    }

    if (!this.activeAdapter) {
      this.activeAdapter = createMemoryAdapter();
    }

    await this.loadAll();

    if (this.activeAdapter.name === 'localStorage' && typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  private async loadAll(): Promise<void> {
    for (const key of PERSISTED_KEYS) {
      try {
        const raw = await this.activeAdapter!.getItem(namespacedKey(key));
        if (raw !== null) {
          this.cache = { ...this.cache, [key]: JSON.parse(raw) };
        }
      } catch {
        // Keep the default value for this key and continue in degraded mode
        // instead of failing the whole app.
        this.recordFailure();
      }
    }
  }

  private recordFailure(): void {
    this.failureCount += 1;
    this.lastErrorAt = Date.now();
  }

  private notify<K extends StorageKey>(key: K, value: DinoQuizPersistedState[K]): void {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const listener of set) {
      listener(value);
    }
  }

  /** Synchronous read of the current in-memory cache (safe to call before init() resolves). */
  snapshot(): DinoQuizPersistedState {
    return { ...this.cache, discoveredFunFacts: [...this.cache.discoveredFunFacts] };
  }

  async get<K extends StorageKey>(key: K): Promise<DinoQuizPersistedState[K]> {
    await this.init();
    return this.cache[key];
  }

  /** Resolves to true if the value was durably persisted, false if it only lives in-memory this session. */
  async set<K extends StorageKey>(key: K, value: DinoQuizPersistedState[K]): Promise<boolean> {
    await this.init();
    this.cache = { ...this.cache, [key]: value };
    this.notify(key, value);

    try {
      await this.activeAdapter!.setItem(namespacedKey(key), JSON.stringify(value));
      return true;
    } catch {
      this.recordFailure();
      return false;
    }
  }

  subscribe<K extends StorageKey>(key: K, listener: Listener<K>): Unsubscribe {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener as Listener<StorageKey>);
    return () => {
      set!.delete(listener as Listener<StorageKey>);
    };
  }

  getDiagnostics(): StorageDiagnostics {
    return {
      backend: this.activeAdapter?.name ?? 'memory',
      isPersistent: (this.activeAdapter?.name ?? 'memory') !== 'memory',
      failureCount: this.failureCount,
      lastErrorAt: this.lastErrorAt,
    };
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    this.listeners.clear();
  }

  // -- Domain helpers -----------------------------------------------------

  async recordScore(score: number): Promise<void> {
    const best = await this.get('bestScore');
    if (score > best) {
      await this.set('bestScore', score);
    }
  }

  async recordStreak(streak: number): Promise<void> {
    const max = await this.get('maxStreak');
    if (streak > max) {
      await this.set('maxStreak', streak);
    }
  }

  async markFunFactDiscovered(funFactId: string): Promise<void> {
    const discovered = await this.get('discoveredFunFacts');
    if (!discovered.includes(funFactId)) {
      await this.set('discoveredFunFacts', [...discovered, funFactId]);
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    await this.set('muted', muted);
  }

  async toggleMute(): Promise<boolean> {
    const muted = await this.get('muted');
    const next = !muted;
    await this.set('muted', next);
    return next;
  }
}
