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
  'questionAnsweredEvents',
  'adsRemoved',
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
  #cache = {
    ...DEFAULT_STATE,
    discoveredFunFacts: [],
    analyticsEventCounts: {},
    questionStats: {},
    questionAnsweredEvents: [],
  };
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
      questionAnsweredEvents: [...this.#cache.questionAnsweredEvents],
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

  /**
   * Sanitizing read for Inicio/Resultados' historic progress display
   * (TRIOFSND-129): `bestScore`/`maxStreak`/`discoveredFunFacts` come back
   * from `#loadAll` already isolated per-key against unreadable JSON (a bad
   * key falls back to its default, see `#loadAll` above), but a value that
   * parses fine and still violates its own contract -- a float, a negative
   * number, a score above 10, a stale/unknown fact id -- would not be caught
   * there. Each field is validated independently here so one malformed field
   * never discards another valid one, and `discoveredFunFacts` is filtered
   * to `validFactIds` (the current catalog, see
   * `src/data/questionBank.js#getFunFactCatalog`) and deduplicated so a
   * stale/unknown/duplicate id never inflates the discovered count.
   */
  async getProgressSummary(validFactIds) {
    const validIds = new Set(Array.isArray(validFactIds) ? validFactIds : []);
    const [bestScore, maxStreak, discoveredFunFacts] = await Promise.all([
      this.get('bestScore'),
      this.get('maxStreak'),
      this.get('discoveredFunFacts'),
    ]);

    const sanitizedBestScore = Number.isInteger(bestScore) && bestScore >= 0 && bestScore <= 10 ? bestScore : 0;
    const sanitizedMaxStreak = Number.isInteger(maxStreak) && maxStreak >= 0 ? maxStreak : 0;
    const sanitizedDiscoveredFunFacts = Array.isArray(discoveredFunFacts)
      ? Array.from(new Set(discoveredFunFacts.filter((id) => validIds.has(id))))
      : [];

    return {
      bestScore: sanitizedBestScore,
      maxStreak: sanitizedMaxStreak,
      discoveredFunFacts: sanitizedDiscoveredFunFacts,
    };
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
   * Whether the single ads-removal in-app purchase (PRD: "eliminar anuncios")
   * has been completed on this device. Screens gate banners/rewarded ads on
   * this flag (TRIOFSND-97, AC-20/AC-21).
   */
  async hasRemovedAds() {
    return this.get('adsRemoved');
  }

  async setAdsRemoved(adsRemoved) {
    await this.set('adsRemoved', adsRemoved);
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
   * Aggregated, non-PII local event counter (no backend, see PRD logging_observability).
   * Unlike `recordEventOnce`, increments on every call -- this is what repeatable
   * product events (e.g. partida_iniciada, one per game start) need.
   */
  async recordEvent(eventName) {
    const counts = await this.get('analyticsEventCounts');
    const next = (counts[eventName] || 0) + 1;
    await this.set('analyticsEventCounts', { ...counts, [eventName]: next });
    return next;
  }

  /**
   * Registers a resolved question locally (TRIOFSND-80): this is the single
   * write point for the whole feature, called once per accepted answer from
   * the bootstrap's `onAnswer` handler (public/scripts/main.js), never from
   * the question screen, so an answer is never recorded/aggregated twice.
   *
   * Persists the minimal, non-PII event `{ tipo: 'pregunta_respondida',
   * id_pregunta, acierto }` (no name/age/email/ad-or-install id/free text/
   * IP/device data) onto the local history, and incrementally updates that
   * question's `total_respuestas`/`total_aciertos` counters -- raw, never
   * rounded -- so its historic `porcentaje_acierto` (`getQuestionStats`) can
   * be derived at any time without replaying individual answers.
   */
  async recordQuestionAnswered(id_pregunta, acierto) {
    const event = { tipo: 'pregunta_respondida', id_pregunta, acierto: Boolean(acierto) };

    const events = await this.get('questionAnsweredEvents');
    await this.set('questionAnsweredEvents', [...events, event]);
    await this.recordEvent('pregunta_respondida');

    const stats = await this.get('questionStats');
    const current = stats[id_pregunta] || { total_respuestas: 0, total_aciertos: 0 };
    const next = {
      total_respuestas: current.total_respuestas + 1,
      total_aciertos: current.total_aciertos + (event.acierto ? 1 : 0),
    };
    await this.set('questionStats', { ...stats, [id_pregunta]: next });

    return this.getQuestionStats(id_pregunta);
  }

  /**
   * Historic aggregate for a question: raw counters plus `porcentaje_acierto`
   * computed from them at full precision (never rounded, never averaged from
   * previously-rounded percentages). Always a finite number between 0 and
   * 100, `0` -- never `NaN`/`Infinity` -- for a question with no answers yet.
   */
  async getQuestionStats(id_pregunta) {
    const stats = await this.get('questionStats');
    const { total_respuestas, total_aciertos } = stats[id_pregunta] || {
      total_respuestas: 0,
      total_aciertos: 0,
    };
    const porcentaje_acierto = total_respuestas > 0 ? (total_aciertos / total_respuestas) * 100 : 0;
    return { total_respuestas, total_aciertos, porcentaje_acierto };
  }

  /**
   * Aggregated, non-PII acierto/fallo counter for the `pregunta_respondida`
   * event (TRIOFSND-92, PRD logging_observability). A thin validation seam
   * over `recordQuestionAnswered`, so the tally shares the single
   * `questionStats` source of truth instead of a second persisted key. It
   * never records which child answered or the option chosen, so the only
   * thing derivable later is the % de fallo por pregunta in aggregate, not
   * any individual child's performance. An invalid/missing `id_pregunta` or
   * a `resultado` outside acierto/fallo is skipped rather than recorded
   * under an anonymous key.
   */
  async recordQuestionResult(idPregunta, resultado) {
    if (typeof idPregunta !== 'string' || idPregunta.length === 0) {
      // No valid id_pregunta: skip rather than create an anonymous/empty key.
      return undefined;
    }
    if (resultado !== 'acierto' && resultado !== 'fallo') {
      return undefined;
    }

    await this.recordQuestionAnswered(idPregunta, resultado === 'acierto');
    return this.getQuestionResults(idPregunta);
  }

  /** Aggregated `{acierto, fallo}` view of a question, derived from `questionStats`. */
  async getQuestionResults(idPregunta) {
    const { total_respuestas, total_aciertos } = await this.getQuestionStats(idPregunta);
    return { acierto: total_aciertos, fallo: total_respuestas - total_aciertos };
  }

  /** Resolves to the aggregated failure rate (0-100) for `idPregunta`, or 0 before any answer. */
  async getQuestionFailureRate(idPregunta) {
    const { acierto, fallo } = await this.getQuestionResults(idPregunta);
    const total = acierto + fallo;
    return total > 0 ? (fallo / total) * 100 : 0;
  }
}

module.exports = { DinoQuizStorage };
