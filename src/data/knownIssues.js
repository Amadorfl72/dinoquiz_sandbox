'use strict';

/**
 * Local registry of open defects for the "Nuevos Modos de Juego" launch,
 * grouped by severity and by the PRD risk area they touch (datos
 * educativos, bloqueo, offline, accesibilidad, pérdida de progreso).
 *
 * This is a plain, hand-maintained record -- not a bug tracker integration
 * (PRD: sin backend, sin analítica remota) -- so
 * tests/launch/regressionGate.test.js can certify "no hay defectos
 * críticos/altos abiertos en las áreas de riesgo" without depending on an
 * external system. Whoever finds a defect adds an entry here; whoever fixes
 * it removes the entry in the same PR -- there is no separate "resolved"
 * status to keep in sync, git history already has that.
 */

const SEVERITY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

// The five PRD risk areas this gate cares about (committed_scope +
// constraints: fichas verificables, bloqueo de modos, funcionamiento
// offline, accesibilidad WCAG AA, progresión/pérdida de progreso).
const RISK_AREAS = Object.freeze({
  DATOS_EDUCATIVOS: 'datosEducativos',
  BLOQUEO: 'bloqueo',
  OFFLINE: 'offline',
  ACCESIBILIDAD: 'accesibilidad',
  PERDIDA_PROGRESO: 'perdidaProgreso',
});

/**
 * Open defects blocking the launch. Each entry is
 * `{ id, severity, area, summary, openedAt }`: `severity` is one of
 * SEVERITY, `area` one of RISK_AREAS, `openedAt` an ISO date string.
 *
 * DINOQUIZ-KI-01: public/scripts/main.js's `evaluateModesWithShadowOverride`
 * (wired into the real mode selector at `renderModeSelector`'s
 * `evaluateModes` option) only replaces the generic
 * modesCatalog.buildCurrentResourceCatalog() verdict for Sombra, Clasifica
 * and Ordena por tamaño with the real, verified src/data/creatureSheet.js
 * check -- it never does the same for Oído Jurásico or Línea del tiempo.
 * buildCurrentResourceCatalog() always sets `hasSound: false` and
 * `era: undefined` for every creature (its own doc comment: real per-mode
 * metadata is read elsewhere until wired), so both modes' MIN_CREATURE_SOUNDS
 * / MIN_CREATURES_WITH_FIELD('era') requirements read as unmet and the
 * selector reports them blocked -- even though both already ship a real
 * screen, round generator/progress service and, for Oído Jurásico, a real
 * recorded sound per creature (public/assets/sounds/oido-jurasico/) and,
 * for Línea del tiempo, a verified `mainPeriod` per creature in
 * CREATURE_SHEETS. No player can actually open either mode today.
 */
const KNOWN_ISSUES = Object.freeze([
  Object.freeze({
    id: 'DINOQUIZ-KI-01',
    severity: SEVERITY.HIGH,
    area: RISK_AREAS.BLOQUEO,
    summary:
      'Oído Jurásico y Línea del tiempo se evalúan contra el catálogo de recursos genérico ' +
      '(modesCatalog.buildCurrentResourceCatalog, sin sonido/era por criatura reales) en vez de ' +
      'la ficha verificada (src/data/creatureSheet.js), así que el selector de modos los muestra ' +
      'bloqueados aunque ya tienen pantalla, generador de rondas y datos reales.',
    openedAt: '2026-08-31',
  }),
]);

/** Whether `severity` is severe enough to block a launch gate (critical or high). */
function isBlockingSeverity(severity) {
  return severity === SEVERITY.CRITICAL || severity === SEVERITY.HIGH;
}

/** Every entry of `issues` (defaults to KNOWN_ISSUES) whose severity blocks a launch (critical/high). */
function getBlockingIssues(issues = KNOWN_ISSUES) {
  return issues.filter((issue) => issue && isBlockingSeverity(issue.severity));
}

/** The subset of `getBlockingIssues(issues)` whose `area` is in `areas`. */
function getBlockingIssuesInAreas(areas, issues = KNOWN_ISSUES) {
  const areaSet = new Set(areas);
  return getBlockingIssues(issues).filter((issue) => areaSet.has(issue.area));
}

module.exports = {
  SEVERITY,
  RISK_AREAS,
  KNOWN_ISSUES,
  isBlockingSeverity,
  getBlockingIssues,
  getBlockingIssuesInAreas,
};
