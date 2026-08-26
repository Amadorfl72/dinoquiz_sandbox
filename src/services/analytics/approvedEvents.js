'use strict';

/**
 * Privacy audit allowlist (TRIOFSND-119, PRD G7: "proteger la privacidad
 * infantil evitando... tracking individual").
 *
 * Single source of truth for every product-analytics event DinoQuiz is
 * allowed to emit, and for the field shapes those events may carry. This is
 * the list `tests/privacy-audit/analytics-events.test.js` diffs the codebase
 * against: a new `recordEvent('algo_nuevo')` call anywhere in `public/` or
 * `src/` fails CI until it's added here deliberately (and reviewed for PII),
 * which is also what the quarterly manual audit in README.md re-checks by
 * hand.
 *
 * Adding an event: add its name below, confirm it carries no field from
 * PII_FIELD_DENYLIST, then update the "Auditoría de privacidad" table in
 * README.md in the same PR.
 */

// Every literal event name ever passed to StorageClient's
// recordEvent/recordEventOnce/recordGameCompleted/recordQuestionAnswered
// (src/services/storage/StorageClient.js) or its browser-inline duplicate
// (public/scripts/main.js) -- aggregated, non-PII counters only, never sent
// off-device (no backend exists to send them to).
const APPROVED_ANALYTICS_EVENTS = [
  'partida_iniciada',
  'first_tap_jugar',
  'pregunta_respondida',
  'pregunta_respondida_fallo',
  'partida_completada',
];

// Fields allowed on the per-question analytics event (TRIOFSND-80,
// src/services/storage/types.js's QuestionAnsweredEvent): question id and
// hit/miss only -- no option chosen, no timing, no child identifier.
const QUESTION_ANSWERED_EVENT_FIELDS = ['tipo', 'id_pregunta', 'acierto'];

// Structured diagnostic/observability log types (src/services/logging/LogService.js).
// Distinct from product analytics above: these describe app/PWA lifecycle,
// never gameplay or the child's answers, and are never transmitted unless a
// caller explicitly opts in via sendLogs(endpointUrl) -- which nothing in
// public/ or src/ does today (see the network-domains audit).
const APPROVED_LOG_EVENT_TYPES = [
  'app_access',
  'service_worker_install',
  'service_worker_activate',
  'manifest_load',
  'pwa_install_attempt',
  'pwa_install_success',
  'pwa_install_failure',
  'level_generation_failed',
  'content_validation_failed',
  'storage_max_unlocked_level_persist_error',
];

// Exact object-key names (lowercased, no separators) that must never appear
// on an emitted analytics or log event/metadata payload. Matched by exact
// equality against a lowercased, underscore-stripped key -- not by raw
// substring -- so legitimate fields like `scoreMetrics.averageScore` (which
// contains "age" as a substring) never false-positive. Covers direct PII,
// device/advertising identifiers (PRD open_risk: "sin IDFA/GAID") and the
// age band captured in ageGateScreen.js, which the PRD requires stays
// in-memory only and never reaches analytics/storage.
const PII_FIELD_DENYLIST = [
  'name',
  'nombre',
  'apellido',
  'email',
  'correo',
  'phone',
  'telefono',
  'address',
  'direccion',
  'birthdate',
  'birthday',
  'fechanacimiento',
  'age',
  'edad',
  'ageband',
  'ip',
  'location',
  'ubicacion',
  'lat',
  'lng',
  'deviceid',
  'installid',
  'advertisingid',
  'idfa',
  'gaid',
  'answer',
  'respuesta',
  'freetext',
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APPROVED_ANALYTICS_EVENTS,
    QUESTION_ANSWERED_EVENT_FIELDS,
    APPROVED_LOG_EVENT_TYPES,
    PII_FIELD_DENYLIST,
  };
}
