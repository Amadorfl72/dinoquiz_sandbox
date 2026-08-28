const fs = require('fs');
const path = require('path');

const ES_PATH = path.resolve(__dirname, '../../public/i18n/es.json');
const EN_PATH = path.resolve(__dirname, '../../public/i18n/en.json');

function collectLeafPaths(node, prefix) {
  return Object.keys(node).reduce((paths, key) => {
    const value = node[key];
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return paths.concat(collectLeafPaths(value, currentPath));
    }
    return paths.concat([currentPath]);
  }, []);
}

function extractParams(value) {
  const matches = value.match(/\{[a-zA-Z]+\}/g) || [];
  return matches.map((token) => token.slice(1, -1)).sort();
}

function getByPath(node, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current[key], node);
}

describe('TRIOFSND-293: timeline i18n parity between es.json and en.json', () => {
  let es;
  let en;

  beforeAll(() => {
    expect(fs.existsSync(ES_PATH)).toBe(true);
    expect(fs.existsSync(EN_PATH)).toBe(true);
    es = JSON.parse(fs.readFileSync(ES_PATH, 'utf-8'));
    en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
  });

  test('both locales define a timeline tree', () => {
    expect(es.timeline).toBeDefined();
    expect(en.timeline).toBeDefined();
  });

  test('timeline key paths are identical between es and en', () => {
    const esPaths = collectLeafPaths(es.timeline, '').sort();
    const enPaths = collectLeafPaths(en.timeline, '').sort();
    expect(enPaths).toEqual(esPaths);
  });

  test('required contract paths are present', () => {
    const requiredPaths = [
      'modeName',
      'instruction',
      'levelFormat',
      'roundFormat',
      'scoreLabel',
      'optionsGroupLabel',
      'nextButton',
      'options.triasico.label',
      'options.triasico.a11yLabel',
      'options.jurasico.label',
      'options.jurasico.a11yLabel',
      'options.cretacico.label',
      'options.cretacico.a11yLabel',
      'feedback.correct',
      'feedback.incorrect',
      'explanation.heading',
      'explanation.interval',
      'explanation.intervalRangeFormat',
      'explanation.classificationFormat.dinosaurio',
      'explanation.classificationFormat.reptil_volador',
      'explanation.classificationFormat.otro',
      'blockedRound.message',
      'gameOver.heading',
      'gameOver.message',
      'locked.message',
      'locked.exitLabel',
    ];
    const esPaths = collectLeafPaths(es.timeline, '');
    const enPaths = collectLeafPaths(en.timeline, '');
    requiredPaths.forEach((requiredPath) => {
      expect(esPaths).toContain(requiredPath);
      expect(enPaths).toContain(requiredPath);
    });
  });

  test('no timeline value is empty in either locale', () => {
    [es, en].forEach((bundle) => {
      collectLeafPaths(bundle.timeline, '').forEach((leafPath) => {
        const value = getByPath(bundle.timeline, leafPath);
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('interpolation params match between es and en for every timeline string', () => {
    const paths = collectLeafPaths(es.timeline, '');
    paths.forEach((leafPath) => {
      const esParams = extractParams(getByPath(es.timeline, leafPath));
      const enParams = extractParams(getByPath(en.timeline, leafPath));
      expect(enParams).toEqual(esParams);
    });
  });

  test('the three periods are exactly Triásico/Jurásico/Cretácico (es) with no fourth option', () => {
    expect(Object.keys(es.timeline.options).sort()).toEqual(['cretacico', 'jurasico', 'triasico']);
  });

  test('the reptil_volador classification (e.g. Pteranodon) never states it is a dinosaur', () => {
    expect(es.timeline.explanation.classificationFormat.reptil_volador.toLowerCase()).not.toMatch(/\bes un dinosaurio/);
    expect(en.timeline.explanation.classificationFormat.reptil_volador.toLowerCase()).toContain('not a dinosaur');
  });

  test('every classification format string interpolates {dinosaur}', () => {
    [es, en].forEach((bundle) => {
      Object.values(bundle.timeline.explanation.classificationFormat).forEach((template) => {
        expect(template).toContain('{dinosaur}');
      });
    });
  });
});
