'use strict';

const {
  DIETAS,
  PERIODOS,
  CLASIFICACIONES,
  CAUSES,
  validateCatalog,
  loadCreatureCatalog,
  getCreatureById,
} = require('./creatureCatalog');
const { getStrings } = require('../i18n');

function buildValidCreature(overrides = {}) {
  return {
    id: 'trex',
    nameKey: 'creatures.trex.name',
    dieta: DIETAS.CARNIVORO,
    longitudMetros: 12,
    periodoPrincipal: PERIODOS.CRETACICO,
    intervaloTemporal: { inicioMa: 68, finMa: 66 },
    habitat: 'creatures.trex.habitat',
    clasificacionCientifica: CLASIFICACIONES.DINOSAURIO,
    image: 'dinosaurs/trex.svg',
    imageRealistic: 'realistic/trex.jpg',
    imageFallback: 'fallback/trex.svg',
    fuentes: [{ nombre: 'American Museum of Natural History (AMNH)', url: 'https://www.amnh.org/' }],
    ...overrides,
  };
}

function buildMemoryLogService() {
  const events = [];
  return {
    events,
    logEvent(eventType, metadata) {
      events.push({ eventType, metadata });
    },
  };
}

describe('real creature catalog (public/data/creatures.json)', () => {
  test('loads without any validation failure', () => {
    const catalog = loadCreatureCatalog();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThan(0);
  });

  test('has no validation failures and logs nothing', () => {
    const logService = buildMemoryLogService();
    const catalog = loadCreatureCatalog();

    const failures = validateCatalog(catalog, { logService });

    expect(failures).toEqual([]);
    expect(logService.events).toEqual([]);
  });

  test('getCreatureById resolves every real id and returns undefined for an unknown one', () => {
    const catalog = loadCreatureCatalog();

    catalog.forEach((creature) => {
      expect(getCreatureById(creature.id, { catalog }).id).toBe(creature.id);
    });
    expect(getCreatureById('not-a-real-creature', { catalog })).toBeUndefined();
  });
});

describe('validateCatalog', () => {
  test('accepts a single well-formed creature', () => {
    const logService = buildMemoryLogService();

    const failures = validateCatalog([buildValidCreature()], { logService });

    expect(failures).toEqual([]);
    expect(logService.events).toEqual([]);
  });

  test('rejects a non-array payload', () => {
    const logService = buildMemoryLogService();

    const failures = validateCatalog({ not: 'an array' }, { logService });

    expect(failures).toEqual([{ id: 'unknown', rule: 'shape', cause: CAUSES.FIELD_INVALID }]);
    expect(logService.events).toEqual([{ eventType: CAUSES.FIELD_INVALID, metadata: { id: 'unknown', rule: 'shape' } }]);
  });

  describe('ficha ausente / no encontrada', () => {
    test('getCreatureById returns undefined for a creature id that does not exist in the catalog', () => {
      const catalog = [buildValidCreature({ id: 'trex' })];

      expect(getCreatureById('velociraptor', { catalog })).toBeUndefined();
    });
  });

  describe('ficha duplicada', () => {
    test('flags every creature sharing a duplicate id with catalog_duplicate_id', () => {
      const logService = buildMemoryLogService();
      const catalog = [
        buildValidCreature({ id: 'trex' }),
        buildValidCreature({ id: 'trex', nameKey: 'creatures.triceratops.name', image: 'dinosaurs/triceratops.svg' }),
      ];

      const failures = validateCatalog(catalog, { logService });

      const duplicateFailures = failures.filter((failure) => failure.cause === CAUSES.DUPLICATE_ID);
      expect(duplicateFailures).toEqual([
        { id: 'trex', rule: 'id', cause: CAUSES.DUPLICATE_ID },
        { id: 'trex', rule: 'id', cause: CAUSES.DUPLICATE_ID },
      ]);
      expect(logService.events).toEqual(
        expect.arrayContaining([{ eventType: CAUSES.DUPLICATE_ID, metadata: { id: 'trex', rule: 'id' } }])
      );
    });

    test('does not flag unique ids as duplicates', () => {
      const catalog = [buildValidCreature({ id: 'trex' }), buildValidCreature({ id: 'triceratops', nameKey: 'creatures.triceratops.name', image: 'dinosaurs/triceratops.svg' })];

      expect(validateCatalog(catalog).some((failure) => failure.cause === CAUSES.DUPLICATE_ID)).toBe(false);
    });
  });

  describe('campo inválido', () => {
    test('rejects an unknown "dieta"', () => {
      const logService = buildMemoryLogService();

      const failures = validateCatalog([buildValidCreature({ dieta: 'omnivoro-raro' })], { logService });

      expect(failures).toEqual([{ id: 'trex', rule: 'dieta', cause: CAUSES.FIELD_INVALID }]);
      expect(logService.events).toEqual([{ eventType: CAUSES.FIELD_INVALID, metadata: { id: 'trex', rule: 'dieta' } }]);
    });

    test('rejects a non-positive "longitudMetros"', () => {
      const failures = validateCatalog([buildValidCreature({ longitudMetros: 0 })]);

      expect(failures).toEqual([{ id: 'trex', rule: 'longitudMetros', cause: CAUSES.FIELD_INVALID }]);
    });

    test('rejects an unknown "clasificacionCientifica"', () => {
      const failures = validateCatalog([buildValidCreature({ clasificacionCientifica: 'anfibio' })]);

      expect(failures).toEqual([{ id: 'trex', rule: 'clasificacionCientifica', cause: CAUSES.FIELD_INVALID }]);
    });

    test('rejects an unknown "periodoPrincipal"', () => {
      const failures = validateCatalog([buildValidCreature({ periodoPrincipal: 'Devonico' })]);

      expect(failures).toEqual([{ id: 'trex', rule: 'periodoPrincipal', cause: CAUSES.FIELD_INVALID }]);
    });

    test('requires a valid "periodoPrincipal" when "intervaloTemporal" is present', () => {
      const failures = validateCatalog([buildValidCreature({ periodoPrincipal: undefined })]);

      expect(failures).toEqual([{ id: 'trex', rule: 'periodoPrincipal', cause: CAUSES.FIELD_INVALID }]);
    });

    test('does not require "periodoPrincipal" when "intervaloTemporal" is absent', () => {
      const failures = validateCatalog([
        buildValidCreature({ periodoPrincipal: undefined, intervaloTemporal: undefined }),
      ]);

      expect(failures).toEqual([]);
    });

    test('rejects an "intervaloTemporal" whose inicioMa is not after finMa', () => {
      const failures = validateCatalog([buildValidCreature({ intervaloTemporal: { inicioMa: 60, finMa: 66 } })]);

      expect(failures).toEqual([{ id: 'trex', rule: 'intervaloTemporal', cause: CAUSES.FIELD_INVALID }]);
    });

    test('rejects a missing/blank "id"', () => {
      const failures = validateCatalog([buildValidCreature({ id: '' })]);

      expect(failures.some((failure) => failure.rule === 'id' && failure.cause === CAUSES.FIELD_INVALID)).toBe(true);
    });

    test('rejects a catalog entry with no institutional "fuentes"', () => {
      const failures = validateCatalog([buildValidCreature({ fuentes: [] })]);

      expect(failures).toEqual([{ id: 'trex', rule: 'fuentes', cause: CAUSES.FIELD_INVALID }]);
    });

    test('rejects a "fuentes" entry with a non-empty nombre/url that is not institutional', () => {
      const failures = validateCatalog([
        buildValidCreature({ fuentes: [{ nombre: 'Blog personal', url: 'https://example.com' }] }),
      ]);

      expect(failures).toEqual([{ id: 'trex', rule: 'fuentes', cause: CAUSES.FIELD_INVALID }]);
    });

    test('accepts a "fuentes" entry whose url uses a recognized institutional domain even without a keyword in nombre', () => {
      const failures = validateCatalog([
        buildValidCreature({ fuentes: [{ nombre: 'Paleontology Dept.', url: 'https://paleo.example.edu/' }] }),
      ]);

      expect(failures).toEqual([]);
    });

    test('rejects a "siluetaMeta" that does not match its schema', () => {
      const failures = validateCatalog([
        buildValidCreature({ siluetaMeta: { aprobada: 'si', grupoCompatibilidad: null, transformacionesPermitidas: [] } }),
      ]);

      expect(failures).toEqual([{ id: 'trex', rule: 'siluetaMeta', cause: CAUSES.FIELD_INVALID }]);
    });

    test('accepts a well-formed "siluetaMeta"', () => {
      const failures = validateCatalog([
        buildValidCreature({
          siluetaMeta: { aprobada: true, grupoCompatibilidad: 'biped_carnivore_large', transformacionesPermitidas: ['flipHorizontal'] },
        }),
      ]);

      expect(failures).toEqual([]);
    });
  });

  describe('referencia rota', () => {
    test('flags a nameKey with no matching i18n translation', () => {
      const logService = buildMemoryLogService();

      const failures = validateCatalog([buildValidCreature({ nameKey: 'creatures.does-not-exist.name' })], {
        logService,
        strings: getStrings('es'),
      });

      expect(failures).toEqual([{ id: 'trex', rule: 'nameKey', cause: CAUSES.REFERENCE_BROKEN }]);
      expect(logService.events).toEqual([
        { eventType: CAUSES.REFERENCE_BROKEN, metadata: { id: 'trex', rule: 'nameKey' } },
      ]);
    });

    test('flags an image reference that does not resolve to a real file', () => {
      const failures = validateCatalog([buildValidCreature({ image: 'dinosaurs/does-not-exist.svg' })], {
        strings: getStrings('es'),
      });

      expect(failures).toEqual([{ id: 'trex', rule: 'image', cause: CAUSES.REFERENCE_BROKEN }]);
    });

    test('flags an imageRealistic/imageFallback reference that does not resolve to a real file', () => {
      const failures = validateCatalog(
        [buildValidCreature({ imageRealistic: 'realistic/does-not-exist.jpg', imageFallback: 'fallback/does-not-exist.svg' })],
        { strings: getStrings('es') }
      );

      expect(failures.map((failure) => failure.rule).sort()).toEqual(['imageFallback', 'imageRealistic']);
      failures.forEach((failure) => expect(failure.cause).toBe(CAUSES.REFERENCE_BROKEN));
    });
  });
});

describe('loadCreatureCatalog', () => {
  test('throws a descriptive error when the catalog carries a violation', () => {
    const logService = buildMemoryLogService();

    expect(() =>
      loadCreatureCatalog({ creatures: [buildValidCreature({ dieta: 'invalida' })], logService })
    ).toThrow(/Invalid creature catalog/);
    expect(logService.events).toEqual([{ eventType: CAUSES.FIELD_INVALID, metadata: { id: 'trex', rule: 'dieta' } }]);
  });

  test('returns the injected creatures when they are all valid', () => {
    const creatures = [buildValidCreature()];

    expect(loadCreatureCatalog({ creatures })).toBe(creatures);
  });
});

describe('getCreatureById', () => {
  test('finds a creature by id in an injected catalog without loading from disk', () => {
    const catalog = [buildValidCreature({ id: 'trex' }), buildValidCreature({ id: 'triceratops', nameKey: 'creatures.triceratops.name', image: 'dinosaurs/triceratops.svg' })];

    expect(getCreatureById('triceratops', { catalog }).id).toBe('triceratops');
  });

  test('returns undefined for an id absent from the catalog', () => {
    const catalog = [buildValidCreature({ id: 'trex' })];

    expect(getCreatureById('unknown-id', { catalog })).toBeUndefined();
  });
});
