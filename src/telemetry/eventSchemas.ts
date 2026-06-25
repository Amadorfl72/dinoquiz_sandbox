/**
 * Event schemas for DinoQuiz product telemetry.
 *
 * All events are anonymous and aggregated. No PII, no cookies,
 * no device identifiers, no full IPs are ever included.
 *
 * Common fields present in every event:
 *  - event:        string identifier
 *  - timestamp:    ISO-8601 string
 *  - app_version:  semver string from package metadata
 *  - locale:       BCP-47 tag (e.g. "es-ES")
 */

export interface TelemetryBase {
  event: string;
  timestamp: string;
  app_version: string;
  locale: string;
}

/**
 * Emitted when the user clicks "Volver a jugar" on the results screen.
 *
 * Fields:
 *  - previous_score: the score (0-10) of the game that just finished.
 *  - timestamp:      when the click occurred.
 */
export interface ReplayClickedEvent extends TelemetryBase {
  event: 'replay_clicked';
  previous_score: number;
}

/**
 * Emitted when a new game starts.
 *
 * Fields:
 *  - trigger:  'initial' when started from the home screen,
 *              'replay'  when started after clicking "Volver a jugar".
 */
export interface GameStartedEvent extends TelemetryBase {
  event: 'game_started';
  trigger: 'initial' | 'replay';
}

/**
 * Computed metric emitted after each game_started.
 *
 * Fields:
 *  - replay_rate_under_5min: boolean indicating whether the replay
 *    occurred within 5 minutes of the previous game completion.
 *  - delta_ms:               milliseconds between replay_clicked and
 *                            the subsequent game_started (null if N/A).
 */
export interface ReplayRateMetric extends TelemetryBase {
  event: 'replay_rate_under_5min';
  replay_rate_under_5min: boolean;
  delta_ms: number | null;
}

export type TelemetryEvent =
  | ReplayClickedEvent
  | GameStartedEvent
  | ReplayRateMetric;

/**
 * Runtime validation helpers. These are lightweight guards rather than
 * a full schema library to keep the bundle small for a kids' PWA.
 */
export function isValidEvent(raw: unknown): raw is TelemetryEvent {
  if (typeof raw !== 'object' || raw === null) return false;
  const e = raw as Record<string, unknown>;
  if (typeof e.event !== 'string') return false;
  if (typeof e.timestamp !== 'string') return false;
  if (typeof e.app_version !== 'string') return false;
  if (typeof e.locale !== 'string') return false;

  switch (e.event) {
    case 'replay_clicked':
      return typeof e.previous_score === 'number'
        && e.previous_score >= 0
        && e.previous_score <= 10;
    case 'game_started':
      return e.trigger === 'initial' || e.trigger === 'replay';
    case 'replay_rate_under_5min':
      return typeof e.replay_rate_under_5min === 'boolean'
        && (e.delta_ms === null || typeof e.delta_ms === 'number');
    default:
      return false;
  }
}
