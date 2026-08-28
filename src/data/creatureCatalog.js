'use strict';

/**
 * Loader/validator for the single, verified creature catalog (TRIOFSND-223,
 * PRD foundation "Ficha única y verificable para todas las criaturas
 * jugables"): every mode reads the same `public/data/creatures.json` instead
 * of re-deriving/duplicating creature facts (mirrors questionBank.js's
 * relationship with public/data/questions.json).
 *
 * Catalog entry shape:
 * {
 *   id: string,                    // unique identifier, e.g. "trex"
 *   nameKey: string,                // i18n key under "creatures.<id>.name" (src/i18n)
 *   dieta: string,                  // one of DIETAS
 *   longitudMetros: number,         // nose-to-tail body length, > 0
 *   periodoPrincipal?: string,      // one of PERIODOS; mandatory once intervaloTemporal is present
 *   intervaloTemporal?: { inicioMa: number, finMa: number }, // "hace X-Y millones de años", inicioMa > finMa >= 0
 *   habitat: string,                // i18n key or plain text describing habitat
 *   clasificacionCientifica: string, // one of CLASIFICACIONES
 *   image: string,                  // cartoon illustration reference (see RESOURCE_FIELDS)
 *   imageRealistic: string,         // realistic-style illustration reference
 *   imageFallback: string,          // local fallback asset reference
 *   fuentes: Array<{ nombre: string, url: string }>, // >=1 institutional source
 *   siluetaMeta?: {                 // optional "Adivina la sombra" silhouette metadata
 *     aprobada: boolean,
 *     grupoCompatibilidad: string | null,
 *     transformacionesPermitidas: string[], // subset of SILUETA_TRANSFORMACIONES
 *   },
 * }
 *
 * `validateCatalog()` never throws: it returns one structured failure per
 * broken rule -- `{ id, rule, cause }`, where `cause` is one of the
 * `CATALOG_*_CAUSE` codes (public/scripts/logging.js) -- and logs each one
 * via `LogService.logEvent(cause, { id, rule })`. No free text or other
 * identifiable data ever goes into that metadata, only the catalog id and
 * the violated rule/field name (mirrors questionBank.js's
 * `content_validation_failed`). `loadCreatureCatalog()` builds on top of it
 * and throws if the catalog carries any violation, since the catalog is
 * curated content (not per-entry-excludable like runtime question data).
 */

const fs = require('fs');
const path = require('path');

const { getStrings } = require('../i18n');
const {
  LogService,
  CATALOG_FIELD_INVALID_CAUSE,
  CATALOG_REFERENCE_BROKEN_CAUSE,
  CATALOG_DUPLICATE_ID_CAUSE,
} = require('../services/logging');

// The catalog JSON lives under public/data so the browser can fetch it at
// runtime, same rationale as questionBank.js's QUESTIONS_JSON_PATH -- this
// Node-side loader reads it via `require()` (like src/i18n/index.js does for
// public/i18n/es.json) rather than `fs.readFileSync`.
const RAW_CREATURES = require('../../public/data/creatures.json');

// Resolved separately (via fs/path, not require) only to check that
// image/imageRealistic/imageFallback references exist on disk.
const IMAGES_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'images');

const DIETAS = Object.freeze({
  CARNIVORO: 'carnivoro',
  HERBIVORO: 'herbivoro',
  OMNIVORO: 'omnivoro',
});
const VALID_DIETAS = Object.values(DIETAS);

const PERIODOS = Object.freeze({
  TRIASICO: 'Triasico',
  JURASICO: 'Jurasico',
  CRETACICO: 'Cretacico',
});
const VALID_PERIODOS = Object.values(PERIODOS);

const CLASIFICACIONES = Object.freeze({
  DINOSAURIO: 'dinosaurio',
  REPTIL_VOLADOR: 'reptil_volador',
  REPTIL_MARINO: 'reptil_marino',
});
const VALID_CLASIFICACIONES = Object.values(CLASIFICACIONES);

const SILUETA_TRANSFORMACIONES = Object.freeze({
  FLIP_HORIZONTAL: 'flipHorizontal',
  ROTATE_90: 'rotate90',
  ROTATE_180: 'rotate180',
});
const VALID_SILUETA_TRANSFORMACIONES = Object.values(SILUETA_TRANSFORMACIONES);

const RESOURCE_FIELDS = Object.freeze(['image', 'imageRealistic', 'imageFallback']);

const CAUSES = Object.freeze({
  FIELD_INVALID: CATALOG_FIELD_INVALID_CAUSE,
  REFERENCE_BROKEN: CATALOG_REFERENCE_BROKEN_CAUSE,
  DUPLICATE_ID: CATALOG_DUPLICATE_ID_CAUSE,
});

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isPositiveFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function resolveI18nKey(strings, key) {
  if (!isNonEmptyString(key)) {
    return undefined;
  }
  return key
    .split('.')
    .reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), strings);
}

// Rejects traversal segments/absolute paths in an image reference before it
// is ever joined onto a filesystem path (same guard as questionBank.test.js's
// sanitizeImageReference), then checks the resolved file actually exists.
function isValidImageReference(imageRef) {
  if (!isNonEmptyString(imageRef) || imageRef.indexOf('..') !== -1) {
    return false;
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(png|jpg|jpeg|svg|webp)$/.test(imageRef)) {
    return false;
  }
  const imagePath = path.join(IMAGES_DIR, imageRef);
  const relativeToImagesDir = path.relative(IMAGES_DIR, imagePath);
  if (relativeToImagesDir.startsWith('..') || path.isAbsolute(relativeToImagesDir)) {
    return false;
  }
  return fs.existsSync(imagePath);
}

function hasInstitutionalSource(creature) {
  return (
    Array.isArray(creature.fuentes) &&
    creature.fuentes.some(
      (fuente) => fuente && typeof fuente === 'object' && isNonEmptyString(fuente.nombre) && isNonEmptyString(fuente.url)
    )
  );
}

// Optional "Adivina la sombra" metadata; absent entirely is valid (not every
// creature has cleared silhouette review yet -- see src/data/creatureSheet.js).
function isValidSiluetaMeta(siluetaMeta) {
  if (siluetaMeta === undefined) {
    return true;
  }
  if (!siluetaMeta || typeof siluetaMeta !== 'object' || Array.isArray(siluetaMeta)) {
    return false;
  }
  if (typeof siluetaMeta.aprobada !== 'boolean') {
    return false;
  }
  if (siluetaMeta.grupoCompatibilidad !== null && !isNonEmptyString(siluetaMeta.grupoCompatibilidad)) {
    return false;
  }
  return (
    Array.isArray(siluetaMeta.transformacionesPermitidas) &&
    siluetaMeta.transformacionesPermitidas.every((transform) => VALID_SILUETA_TRANSFORMACIONES.includes(transform))
  );
}

function isValidIntervaloTemporal(intervalo) {
  return (
    Boolean(intervalo) &&
    typeof intervalo === 'object' &&
    !Array.isArray(intervalo) &&
    isPositiveFiniteNumber(intervalo.inicioMa) &&
    isNonNegativeFiniteNumber(intervalo.finMa) &&
    intervalo.inicioMa > intervalo.finMa
  );
}

// Per-creature structured violations: one `{ id, rule, cause }` per broken
// rule (excludes catalog-wide id-uniqueness, handled by validateCatalog()).
function collectCreatureViolations(creature, strings) {
  if (!creature || typeof creature !== 'object' || Array.isArray(creature)) {
    return [{ id: 'unknown', rule: 'shape', cause: CAUSES.FIELD_INVALID }];
  }

  const id = isNonEmptyString(creature.id) ? creature.id : 'unknown';
  const violations = [];
  const fail = (rule, cause) => violations.push({ id, rule, cause });

  if (!isNonEmptyString(creature.id)) {
    fail('id', CAUSES.FIELD_INVALID);
  }

  if (!VALID_DIETAS.includes(creature.dieta)) {
    fail('dieta', CAUSES.FIELD_INVALID);
  }

  if (!isPositiveFiniteNumber(creature.longitudMetros)) {
    fail('longitudMetros', CAUSES.FIELD_INVALID);
  }

  const hasPeriodoPrincipal = creature.periodoPrincipal !== undefined;
  if (hasPeriodoPrincipal && !VALID_PERIODOS.includes(creature.periodoPrincipal)) {
    fail('periodoPrincipal', CAUSES.FIELD_INVALID);
  }

  if (creature.intervaloTemporal !== undefined) {
    if (!isValidIntervaloTemporal(creature.intervaloTemporal)) {
      fail('intervaloTemporal', CAUSES.FIELD_INVALID);
    }
    // A precise time interval implies a valid main period; only fail here
    // when it's missing outright, so an invalid-but-present one isn't
    // double-reported (already flagged by the check above).
    if (!hasPeriodoPrincipal) {
      fail('periodoPrincipal', CAUSES.FIELD_INVALID);
    }
  }

  if (!VALID_CLASIFICACIONES.includes(creature.clasificacionCientifica)) {
    fail('clasificacionCientifica', CAUSES.FIELD_INVALID);
  }

  if (!isNonEmptyString(creature.habitat)) {
    fail('habitat', CAUSES.FIELD_INVALID);
  }

  if (!isNonEmptyString(creature.nameKey)) {
    fail('nameKey', CAUSES.FIELD_INVALID);
  } else if (resolveI18nKey(strings, creature.nameKey) === undefined) {
    fail('nameKey', CAUSES.REFERENCE_BROKEN);
  }

  RESOURCE_FIELDS.forEach((field) => {
    if (!isNonEmptyString(creature[field])) {
      fail(field, CAUSES.FIELD_INVALID);
    } else if (!isValidImageReference(creature[field])) {
      fail(field, CAUSES.REFERENCE_BROKEN);
    }
  });

  if (!hasInstitutionalSource(creature)) {
    fail('fuentes', CAUSES.FIELD_INVALID);
  }

  if (!isValidSiluetaMeta(creature.siluetaMeta)) {
    fail('siluetaMeta', CAUSES.FIELD_INVALID);
  }

  return violations;
}

let defaultLogService;
function getDefaultLogService() {
  if (!defaultLogService) {
    defaultLogService = new LogService();
  }
  return defaultLogService;
}

function logCatalogFailure(logService, failure) {
  logService.logEvent(failure.cause, { id: failure.id, rule: failure.rule });
}

/**
 * Validates the whole catalog and returns one structured failure per broken
 * rule (`{ id, rule, cause }`), logging each via `options.logService` (a
 * `LogService`-shaped `{ logEvent(eventType, metadata) }`, defaulting to a
 * shared `LogService` instance). Never throws -- callers decide what an
 * empty vs. non-empty result means (`loadCreatureCatalog()` throws).
 */
function validateCatalog(creatures, options = {}) {
  const logService = options.logService || getDefaultLogService();
  const strings = options.strings || getStrings('es');

  if (!Array.isArray(creatures)) {
    const failure = { id: 'unknown', rule: 'shape', cause: CAUSES.FIELD_INVALID };
    logCatalogFailure(logService, failure);
    return [failure];
  }

  const failures = creatures.flatMap((creature) => collectCreatureViolations(creature, strings));

  const idCounts = creatures.reduce((counts, creature) => {
    if (creature && isNonEmptyString(creature.id)) {
      counts[creature.id] = (counts[creature.id] || 0) + 1;
    }
    return counts;
  }, {});

  creatures.forEach((creature) => {
    if (creature && isNonEmptyString(creature.id) && idCounts[creature.id] > 1) {
      failures.push({ id: creature.id, rule: 'id', cause: CAUSES.DUPLICATE_ID });
    }
  });

  failures.forEach((failure) => logCatalogFailure(logService, failure));

  return failures;
}

/**
 * Loads the creature catalog (from `options.creatures`, or
 * `public/data/creatures.json` via `require()` by default) and throws if
 * `validateCatalog()` reports any violation -- the catalog is curated
 * content, not per-entry-excludable like questionBank.js's runtime pool.
 */
function loadCreatureCatalog(options = {}) {
  const creatures = options.creatures || RAW_CREATURES;
  const failures = validateCatalog(creatures, options);

  if (failures.length > 0) {
    throw new Error(`Invalid creature catalog: ${failures.length} violation(s) found`);
  }

  return creatures;
}

/** The creature with the given `id` from `options.catalog` (raw array) or a freshly loaded/validated catalog, or `undefined`. */
function getCreatureById(id, options = {}) {
  const catalog = options.catalog || loadCreatureCatalog(options);
  return catalog.find((creature) => creature && creature.id === id);
}

module.exports = {
  DIETAS,
  VALID_DIETAS,
  PERIODOS,
  VALID_PERIODOS,
  CLASIFICACIONES,
  VALID_CLASIFICACIONES,
  SILUETA_TRANSFORMACIONES,
  VALID_SILUETA_TRANSFORMACIONES,
  RESOURCE_FIELDS,
  CAUSES,
  validateCatalog,
  loadCreatureCatalog,
  getCreatureById,
};
