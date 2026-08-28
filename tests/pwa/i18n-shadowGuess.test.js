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

describe('TRIOFSND-264: shadowGuess i18n parity between es.json and en.json', () => {
  let es;
  let en;

  beforeAll(() => {
    expect(fs.existsSync(ES_PATH)).toBe(true);
    expect(fs.existsSync(EN_PATH)).toBe(true);
    es = JSON.parse(fs.readFileSync(ES_PATH, 'utf-8'));
    en = JSON.parse(fs.readFileSync(EN_PATH, 'utf-8'));
  });

  test('both locales define a shadowGuess tree', () => {
    expect(es.shadowGuess).toBeDefined();
    expect(en.shadowGuess).toBeDefined();
  });

  test('shadowGuess key paths are identical between es and en', () => {
    const esPaths = collectLeafPaths(es.shadowGuess, '').sort();
    const enPaths = collectLeafPaths(en.shadowGuess, '').sort();
    expect(enPaths).toEqual(esPaths);
  });

  test('required contract paths are present', () => {
    const requiredPaths = [
      'name',
      'instructions',
      'options.option1Label',
      'options.option2Label',
      'options.option3Label',
      'options.option4Label',
      'feedback.correct',
      'feedback.incorrect',
      'feedback.correctAnswer',
      'blocked.insufficientCatalog',
      'results.title',
      'results.score',
      'results.percentage',
      'results.stars',
      'results.progress',
    ];
    const esPaths = collectLeafPaths(es.shadowGuess, '');
    const enPaths = collectLeafPaths(en.shadowGuess, '');
    requiredPaths.forEach((requiredPath) => {
      expect(esPaths).toContain(requiredPath);
      expect(enPaths).toContain(requiredPath);
    });
  });

  test('no shadowGuess value is empty in either locale', () => {
    [es, en].forEach((bundle) => {
      collectLeafPaths(bundle.shadowGuess, '').forEach((leafPath) => {
        const value = getByPath(bundle.shadowGuess, leafPath);
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('name identifies the mode correctly in each language', () => {
    expect(es.shadowGuess.name).toBe('Adivina la sombra');
    expect(en.shadowGuess.name).toBe('Guess the Shadow');
  });

  test('blocked.insufficientCatalog explicitly states the 12-creature minimum', () => {
    expect(es.shadowGuess.blocked.insufficientCatalog).toMatch(/12/);
    expect(en.shadowGuess.blocked.insufficientCatalog).toMatch(/12/);
  });

  test('interpolation params match between es and en for every shadowGuess string', () => {
    const paths = collectLeafPaths(es.shadowGuess, '');
    paths.forEach((leafPath) => {
      const esParams = extractParams(getByPath(es.shadowGuess, leafPath));
      const enParams = extractParams(getByPath(en.shadowGuess, leafPath));
      expect(enParams).toEqual(esParams);
    });
  });

  test('each option label announces its own position number', () => {
    ['1', '2', '3', '4'].forEach((position) => {
      const key = `option${position}Label`;
      expect(es.shadowGuess.options[key]).toContain(position);
      expect(en.shadowGuess.options[key]).toContain(position);
    });
  });
});
