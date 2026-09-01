'use strict';

/**
 * Schema-version migration for a persisted per-mode envelope (TRIOFSND-300,
 * PRD "Migración segura de estado ante cambios de versión incompatibles").
 *
 * Before this module existed, GameSessionStorage.js#restoreSession discarded
 * any envelope whose `schemaVersion` didn't already match
 * `SESSION_SCHEMA_VERSION` outright -- a version bump always lost the
 * in-progress round, even when the old shape could have been translated
 * forward safely. `applyMigrations` gives it a path instead: `migrations` is
 * a registry of pure, single-step transforms keyed by the *old* version they
 * upgrade from (`migrations[oldVersion](envelope) -> envelope at oldVersion + 1`,
 * or whatever the next registered version is). `applyMigrations` walks that
 * chain from the envelope's own `schemaVersion` up to `targetVersion`, one
 * registered step at a time.
 *
 * Returns the migrated envelope, still unvalidated -- the caller (e.g.
 * GameSessionStorage.js#restoreSession) MUST still run it through its own
 * integrity check (isValidEnvelope/isValidModeState) before trusting it, so
 * a migration that produces a structurally broken result is caught exactly
 * like any other invalid state. Returns null, changing nothing, whenever no
 * migration path exists to `targetVersion` -- an unknown old version, a
 * version newer than `targetVersion` (a downgrade, e.g. after rolling back a
 * release), a break in the chain, or a migration step that itself returns
 * something unusable -- so the caller can discard that as a distinct,
 * non-migratable version rather than a plain integrity failure.
 *
 * No migrations are registered in `DEFAULT_MIGRATIONS` yet: the versioned
 * shapes this guards (GameSessionStorage.js's transient session envelope,
 * sourced from types.js's MODE_STATE_SCHEMA_VERSION) have never changed.
 * Add an entry keyed by the version being upgraded *from* when they do.
 */

const DEFAULT_MIGRATIONS = {
  // Example shape for the next incompatible bump:
  // 1: (envelope) => Object.assign({}, envelope, { schemaVersion: 2, /* ...new/renamed fields... */ }),
};

/**
 * Pure: never mutates `envelope`, and a `migrations` registry lookup never
 * has side effects. Bounds the number of steps to the registry size so a
 * miswritten migration that doesn't advance `schemaVersion` (or a cycle)
 * can't loop forever.
 */
function applyMigrations(envelope, targetVersion, migrations = DEFAULT_MIGRATIONS) {
  if (!envelope || typeof envelope !== 'object' || !Number.isInteger(envelope.schemaVersion)) {
    return null;
  }
  if (!Number.isInteger(targetVersion)) {
    return null;
  }

  let migrated = envelope;
  let steps = 0;
  const maxSteps = Object.keys(migrations).length + 1;

  while (migrated.schemaVersion !== targetVersion) {
    if (steps >= maxSteps) {
      return null;
    }

    const migrate = migrations[migrated.schemaVersion];
    if (typeof migrate !== 'function') {
      return null;
    }

    const next = migrate(migrated);
    steps += 1;

    if (!next || typeof next !== 'object' || !Number.isInteger(next.schemaVersion) || next.schemaVersion === migrated.schemaVersion) {
      return null;
    }

    migrated = next;
  }

  return migrated;
}

module.exports = { DEFAULT_MIGRATIONS, applyMigrations };
