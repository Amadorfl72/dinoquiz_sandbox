'use strict';

const { DEFAULT_MIGRATIONS, applyMigrations } = require('./stateMigration');

describe('applyMigrations (TRIOFSND-300)', () => {
  it('returns the envelope unchanged in effect when it is already at targetVersion (no step run)', () => {
    const envelope = { schemaVersion: 3, foo: 'bar' };
    expect(applyMigrations(envelope, 3, {})).toEqual(envelope);
  });

  it('applies a single registered migration to reach targetVersion', () => {
    const envelope = { schemaVersion: 1, foo: 'bar' };
    const migrations = {
      1: (e) => Object.assign({}, e, { schemaVersion: 2, addedField: true }),
    };

    expect(applyMigrations(envelope, 2, migrations)).toEqual({ schemaVersion: 2, foo: 'bar', addedField: true });
  });

  it('chains multiple registered migrations in order', () => {
    const envelope = { schemaVersion: 1 };
    const migrations = {
      1: (e) => Object.assign({}, e, { schemaVersion: 2 }),
      2: (e) => Object.assign({}, e, { schemaVersion: 3 }),
    };

    expect(applyMigrations(envelope, 3, migrations)).toEqual({ schemaVersion: 3 });
  });

  it('never mutates the input envelope', () => {
    const envelope = { schemaVersion: 1, nested: { a: 1 } };
    const snapshot = JSON.stringify(envelope);
    const migrations = { 1: (e) => Object.assign({}, e, { schemaVersion: 2 }) };

    applyMigrations(envelope, 2, migrations);

    expect(JSON.stringify(envelope)).toBe(snapshot);
  });

  it('returns null when no migration is registered for the envelope\'s version', () => {
    const envelope = { schemaVersion: 1 };
    expect(applyMigrations(envelope, 2, {})).toBeNull();
  });

  it('returns null for a version newer than targetVersion (no downgrade path)', () => {
    const envelope = { schemaVersion: 5 };
    const migrations = { 1: (e) => Object.assign({}, e, { schemaVersion: 2 }) };

    expect(applyMigrations(envelope, 2, migrations)).toBeNull();
  });

  it('returns null when a migration step breaks the chain (no migration registered for the intermediate version)', () => {
    const envelope = { schemaVersion: 1 };
    const migrations = { 1: (e) => Object.assign({}, e, { schemaVersion: 2 }) };

    expect(applyMigrations(envelope, 3, migrations)).toBeNull();
  });

  it('returns null when a migration step does not advance schemaVersion (guards against an infinite loop)', () => {
    const envelope = { schemaVersion: 1 };
    const migrations = { 1: (e) => Object.assign({}, e) };

    expect(applyMigrations(envelope, 2, migrations)).toBeNull();
  });

  it('returns null when a migration step returns something structurally unusable', () => {
    const envelope = { schemaVersion: 1 };
    const migrations = { 1: () => null };

    expect(applyMigrations(envelope, 2, migrations)).toBeNull();
  });

  it('returns null for a non-object envelope or a missing/non-integer schemaVersion', () => {
    expect(applyMigrations(null, 1, {})).toBeNull();
    expect(applyMigrations(undefined, 1, {})).toBeNull();
    expect(applyMigrations('not-an-object', 1, {})).toBeNull();
    expect(applyMigrations({ schemaVersion: 'not-a-number' }, 1, {})).toBeNull();
    expect(applyMigrations({}, 1, {})).toBeNull();
  });

  it('returns null for a non-integer targetVersion', () => {
    expect(applyMigrations({ schemaVersion: 1 }, undefined, {})).toBeNull();
  });

  it('defaults to DEFAULT_MIGRATIONS (an empty registry today) when no migrations argument is passed', () => {
    expect(applyMigrations({ schemaVersion: 1 }, 2)).toBeNull();
    expect(DEFAULT_MIGRATIONS).toEqual({});
  });
});
