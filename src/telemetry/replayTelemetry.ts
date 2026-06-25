/**
 * Replay telemetry module for DinoQuiz (TRIOFSND-41).
 *
 * Responsibilities:
 *  1. Emit 'replay_clicked' with previous_score and timestamp.
 *  2. Emit 'game_started' with trigger:'replay' (or 'initial').
 *  3. Calculate and emit the 'replay_rate_under_5min' metric by
 *     measuring the delta between 'replay_clicked' and the next
 *     'game_started'.
 *  4. Provide a resilient send pipeline with a bounded retry buffer
 *     so telemetry failures never affect the child's experience.
 *
 * Privacy: all events are anonymous. No PII, no cookies, no device IDs.
 */

import {
  GameStartedEvent,
  ReplayClickedEvent,
  ReplayRateMetric,
  TelemetryEvent,
  isValidEvent,
} from './eventSchemas';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const MAX_BUFFER_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Transport function provided by the host application.
 * Should be non-blocking; failures are handled by the buffer.
 */
export type TelemetryTransport = (events: TelemetryEvent[]) => Promise<void>;

export interface TelemetryConfig {
  appVersion: string;
  locale: string;
  transport: TelemetryTransport;
  /** Optional clock override for testing. */
  now?: () => number;
}

interface BufferedEvent {
  event: TelemetryEvent;
  retries: number;
}

// ---------------------------------------------------------------------------
// Module state (single instance)
// ---------------------------------------------------------------------------

let config: TelemetryConfig | null = null;
let buffer: BufferedEvent[] = [];
let flushInProgress = false;

/**
 * Timestamp (epoch ms) of the most recent 'replay_clicked' event.
 * Used to compute the replay-rate delta when the next 'game_started'
 * arrives. Reset after consumption.
 */
let lastReplayClickedTs: number | null = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export function initTelemetry(cfg: TelemetryConfig): void {
  config = cfg;
  buffer = [];
  flushInProgress = false;
  lastReplayClickedTs = null;
}

/** Reset all internal state — primarily for tests. */
export function _resetTelemetry(): void {
  config = null;
  buffer = [];
  flushInProgress = false;
  lastReplayClickedTs = null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function nowMs(): number {
  return config?.now?.() ?? Date.now();
}

function isoTimestamp(): string {
  return new Date(nowMs()).toISOString();
}

function baseFields() {
  if (!config) {
    throw new Error('Telemetry not initialized. Call initTelemetry() first.');
  }
  return {
    timestamp: isoTimestamp(),
    app_version: config.appVersion,
    locale: config.locale,
  };
}

/**
 * Enqueue an event into the retry buffer and trigger an async flush.
 * All errors are caught so the UI is never affected.
 */
function enqueue(event: TelemetryEvent): void {
  try {
    if (!isValidEvent(event)) {
      console.warn('[telemetry] Invalid event dropped:', event);
      return;
    }
    buffer.push({ event, retries: 0 });
    if (buffer.length > MAX_BUFFER_SIZE) {
      // Drop oldest to prevent unbounded growth.
      buffer.shift();
    }
    void flushBuffer();
  } catch (err) {
    console.error('[telemetry] Failed to enqueue event:', err);
  }
}

/**
 * Attempt to send all buffered events. Uses exponential back-off
 * via retries counter. Events exceeding MAX_RETRIES are dropped
 * with a warning log.
 */
async function flushBuffer(): Promise<void> {
  if (flushInProgress || buffer.length === 0 || !config) return;
  flushInProgress = true;

  const batch = buffer.slice();
  try {
    await config.transport(batch.map(b => b.event));
    // Success: clear sent events from buffer.
    buffer = buffer.slice(batch.length);
  } catch (err) {
    console.error('[telemetry] Transport failed, will retry:', err);
    // Increment retry counts; drop events that exceeded max retries.
    buffer = batch
      .map(b => ({ ...b, retries: b.retries + 1 }))
      .filter(b => {
        if (b.retries > MAX_RETRIES) {
          console.warn('[telemetry] Event dropped after max retries:', b.event);
          return false;
        }
        return true;
      });
    // Schedule a retry after delay.
    if (buffer.length > 0) {
      setTimeout(() => { void flushBuffer(); }, RETRY_DELAY_MS);
    }
  } finally {
    flushInProgress = false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit 'replay_clicked'.
 *
 * @param previousScore  Score (0-10) of the game that just finished.
 */
export function emitReplayClicked(previousScore: number): void {
  try {
    if (typeof previousScore !== 'number'
        || previousScore < 0
        || previousScore > 10) {
      console.warn('[telemetry] Invalid previous_score:', previousScore);
      return;
    }

    const event: ReplayClickedEvent = {
      ...baseFields(),
      event: 'replay_clicked',
      previous_score: previousScore,
    };

    // Store the epoch timestamp for delta calculation.
    lastReplayClickedTs = nowMs();

    enqueue(event);
  } catch (err) {
    console.error('[telemetry] emitReplayClicked failed:', err);
  }
}

/**
 * Emit 'game_started'.
 *
 * @param trigger  'initial' when started from home screen,
 *                 'replay'  when started after "Volver a jugar".
 */
export function emitGameStarted(trigger: 'initial' | 'replay'): void {
  try {
    const event: GameStartedEvent = {
      ...baseFields(),
      event: 'game_started',
      trigger,
    };
    enqueue(event);

    // If this game was triggered by a replay click, compute the
    // replay-rate metric.
    if (trigger === 'replay') {
      emitReplayRateMetric();
    }
  } catch (err) {
    console.error('[telemetry] emitGameStarted failed:', err);
  }
}

/**
 * Calculate and emit the 'replay_rate_under_5min' metric.
 *
 * Logic:
 *  - If lastReplayClickedTs is set, compute delta_ms between
 *    that timestamp and now.
 *  - Emit replay_rate_under_5min = (delta_ms < 5 min).
 *  - Reset lastReplayClickedTs so it's only consumed once.
 *  - If lastReplayClickedTs is null (no preceding replay_clicked),
 *    emit the metric with delta_ms = null and replay_rate_under_5min = false.
 */
function emitReplayRateMetric(): void {
  try {
    let deltaMs: number | null = null;
    let under5Min = false;

    if (lastReplayClickedTs !== null) {
      deltaMs = nowMs() - lastReplayClickedTs;
      under5Min = deltaMs < FIVE_MINUTES_MS;
      // Consume the stored timestamp.
      lastReplayClickedTs = null;
    }

    const metric: ReplayRateMetric = {
      ...baseFields(),
      event: 'replay_rate_under_5min',
      replay_rate_under_5min: under5Min,
      delta_ms: deltaMs,
    };

    enqueue(metric);
  } catch (err) {
    console.error('[telemetry] emitReplayRateMetric failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Test-only accessors
// ---------------------------------------------------------------------------

/** Returns a snapshot of the current buffer (for tests). */
export function _getBuffer(): TelemetryEvent[] {
  return buffer.map(b => b.event);
}

/** Returns the stored replay_clicked timestamp (for tests). */
export function _getLastReplayClickedTs(): number | null {
  return lastReplayClickedTs;
}
