const { createIndexedDbAdapter } = require('./adapters/indexedDbAdapter');
const { createLocalStorageAdapter } = require('./adapters/localStorageAdapter');
const { createMemoryAdapter } = require('./adapters/memoryAdapter');
const { DEFAULT_STATE } = require('./types');

const NAMESPACE = 'dinoquiz:';
const PERSISTED_KEYS = [
  'bestScore',
  'maxStreak',
  'discoveredFunFacts',
  'muted',
  'homeTooltipSeen',
  'analyticsEventCounts',
  'questionStats',
];

function namespacedKey(key) {
  return `${NAMESPACE}${key}`;
}

function keyFromNamespaced(namespaced) {
  if (!namespaced.startsWith(NAMESPACE)) {
    return null;
  }
  const key = namespaced.slice(NAMESPACE.length);
  return PERSISTED_KEYS.includes(key) ? key : null;
}

/**
 * Client-side persistence service for DinoQuiz.
 *
 * Wraps IndexedDB with automatic fallback to localStorage, and finally to an
 * in-memory store if both are unavailable or throw. The game must stay fully
 * playable in that last, degraded mode -- it simply won't remember anything
 * across reloads.
 */
class DinoQuizStorage {
  #adapters;
  #activeAdapter = null;
  #cache = { ...DEFAULT_STATE, discoveredFunFacts: [], analyticsEventCounts: {}, questionStats: {} };
  #listeners = new Map();
  #initPromise = null;

  // Aggregated, non-PII observability counters only.
  #failureCount = 0;
  #lastErrorAt = null;

  #handleStorageEvent = (event) => {
    if (!event.key) return;
    const key = keyFromNamespaced(event.key);
    if (!key) return;

    try {
      const value = event.newValue !== null ? JSON.parse(event.newValue) : DEFAULT_STATE[key];
      this.#cache = { ...this.#cache, [key]: value };
      this.#notify(key, value);
    } catch {
      this.#recordFailure();
    }
  };

  constructor(adapters = [createIndexedDbAdapter(), createLocalStorageAdapter(), createMemoryAdapter()]) {
    this.#adapters = adapters;
  }

  init() {
    if (!this.#initPromise) {
      this.#initPromise = this.#doInit();
    }
    return this.#initPromise;
  }

  async #doInit() {
    for (const adapter of this.#adapters) {
      try {
        if (await adapter.isAvailable()) {
          this.#activeAdapter = adapter;
          break;
        }
      } catch {
        this.#recordFailure();
      }
    }

    if (!this.#activeAdapter) {
      this.#activeAdapter = createMemoryAdapter();
    }

    await this.#loadAll();

    if (this.#activeAdapter.name === 'localStorage' && typeof window !== 'undefined') {
      window.addEventListener('storage', this.#handleStorageEvent);
    }
  }

  /** Swaps the active adapter, keeping the `storage` event listener in sync. */
  #switchActiveAdapter(adapter) {
    if (this.#activeAdapter === adapter) return;

    if (typeof window !== 'undefined' && this.#activeAdapter?.name === 'localStorage') {
      window.removeEventListener('storage', this.#handleStorageEvent);
    }

    this.#activeAdapter = adapter;

    if (typeof window !== 'undefined' && adapter.name === 'localStorage') {
      window.addEventListener('storage', this.#handleStorageEvent);
    }
  }

  async #loadAll() {
    for (const key of PERSISTED_KEYS) {
      try {
        const raw = await this.#activeAdapter.getItem(namespacedKey(key));
        if (raw !== null) {
          this.#cache = { ...this.#cache, [key]: JSON.parse(raw) };
        }
      } catch {
        // Keep the default value for this key and continue in degraded mode
        // instead of failing the whole app.
        this.#recordFailure();
      }
    }
  }

  #recordFailure() {
    this.#failureCount += 1;
    this.#lastErrorAt = Date.now();
  }

  #notify(key, value) {
    const set = this.#listeners.get(key);
    if (!set) return;
    for (const listener of set) {
      listener(value);
    }
  }

  /** Synchronous read of the current in-memory cache (safe to call before init() resolves). */
  snapshot() {
    return {
      ...this.#cache,
      discoveredFunFacts: [...this.#cache.discoveredFunFacts],
      analyticsEventCounts: { ...this.#cache.analyticsEventCounts },
      questionStats: { ...this.#cache.questionStats },
    };
  }

  async get(key) {
    await this.init();
    return this.#cache[key];
  }

  /**
   * Resolves to true if the value was durably persisted, false if it only lives in-memory this session.
   *
   * If the active adapter throws (e.g. IndexedDB access denied, localStorage quota
   * exceeded), this walks the remaining adapters in priority order -- localStorage,
   * then memory -- and promotes the first one that accepts the write to be the new
   * active adapter, so later reads/writes and diagnostics reflect reality instead of
   * a backend that just proved it can't persist.
   */
  async set(key, value) {
    await this.init();
    this.#cache = { ...this.#cache, [key]: value };
    this.#notify(key, value);

    const activeIndex = this.#activeAdapter ? this.#adapters.indexOf(this.#activeAdapter) : -1;
    const candidates = this.#adapters.slice(Math.max(activeIndex, 0));

    for (const adapter of candidates) {
      try {
        if (adapter !== this.#activeAdapter && !(await adapter.isAvailable())) {
          continue;
        }
        await adapter.setItem(namespacedKey(key), JSON.stringify(value));
        this.#switchActiveAdapter(adapter);
        return true;
      } catch {
        this.#recordFailure();
      }
    }

    // Every remaining adapter is unavailable or threw: degrade to a fresh
    // in-memory backend so the app stays playable and diagnostics stop
    // reporting a backend that can no longer persist.
    this.#switchActiveAdapter(createMemoryAdapter());
    return false;
  }

  subscribe(key, listener) {
    let set = this.#listeners.get(key);
    if (!set) {
      set = new Set();
      this.#listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  getDiagnostics() {
    return {
      backend: this.#activeAdapter?.name ?? 'memory',
      isPersistent: (this.#activeAdapter?.name ?? 'memory') !== 'memory',
      failureCount: this.#failureCount,
      lastErrorAt: this.#lastErrorAt,
    };
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.#handleStorageEvent);
    }
    this.#listeners.clear();
  }

  // -- Domain helpers -----------------------------------------------------

  async recordScore(score) {
    const best = await this.get('bestScore');
    if (score > best) {
      await this.set('bestScore', score);
    }
  }

  async recordStreak(streak) {
    const max = await this.get('maxStreak');
    if (streak > max) {
      await this.set('maxStreak', streak);
    }
  }

  async markFunFactDiscovered(funFactId) {
    const discovered = await this.get('discoveredFunFacts');
    if (!discovered.includes(funFactId)) {
      await this.set('discoveredFunFacts', [...discovered, funFactId]);
    }
  }

  async setMuted(muted) {
    await this.set('muted', muted);
  }

  async toggleMute() {
    const muted = await this.get('muted');
    const next = !muted;
    await this.set('muted', next);
    return next;
  }

  /** Whether the first-run "¡Jugar!" tooltip has already been dismissed on this device. */
  async hasSeenHomeTooltip() {
    return this.get('homeTooltipSeen');
  }

  async markHomeTooltipSeen() {
    await this.set('homeTooltipSeen', true);
  }

  /**
   * Aggregated, non-PII local event counter (no backend, see PRD logging_observability).
   * Idempotent per `eventName`: only the first call for a given name increments the
   * count, which is what "first_*"-style events (e.g. first_tap_jugar) need.
   */
  async recordEventOnce(eventName) {
    const counts = await this.get('analyticsEventCounts');
    if (counts[eventName]) {
      return counts[eventName];
    }
    await this.set('analyticsEventCounts', { ...counts, [eventName]: 1 });
    return 1;
  }

  async getEventCount(eventName) {
    const counts = await this.get('analyticsEventCounts');
    return counts[eventName] || 0;
  }

  /**
   * Aggregated, non-PII local counter for the `pregunta_respondida` event
   * (see PRD logging_observability). Only tallies attempts/failures per
   * `questionId` -- it never records which child answered or a per-answer
   * log, so the only thing derivable later is the % de fallo por pregunta,
   * not any individual child's performance.
   */
  async recordQuestionAnswered(questionId, isCorrect) {
    const stats = await this.get('questionStats');
    const current = stats[questionId] || { attempts: 0, failures: 0 };
    const next = {
      attempts: current.attempts + 1,
      failures: isCorrect ? current.failures : current.failures + 1,
    };
    await this.set('questionStats', { ...stats, [questionId]: next });
    return next;
  }

  async getQuestionStats(questionId) {
    const stats = await this.get('questionStats');
    return stats[questionId] || { attempts: 0, failures: 0 };
  }

  /** Resolves to the aggregated failure rate (0-1) for `questionId`, or 0 before any attempt. */
  async getQuestionFailureRate(questionId) {
    const { attempts, failures } = await this.getQuestionStats(questionId);
    return attempts > 0 ? failures / attempts : 0;
  }
}

module.exports = { DinoQuizStorage };
