'use strict';

/**
 * TRIOFSND-312: transversal completeness gate for DinoQuiz's i18n contract
 * (PRD "Nuevos Modos de Juego" -- constraint "Todo texto visible o anunciado
 * debe proceder de public/i18n/").
 *
 * Two independent checks live here:
 *
 * 1. i18n key completeness across public/i18n/*.json. Per
 *    src/i18n/index.js, 'es' is the only *runtime-supported* locale (v1
 *    ships only Spanish) -- other locale files under public/i18n/ (today
 *    just en.json) are translated section-by-section as individual modes
 *    ship (see tests/pwa/i18n-timeline.test.js, i18n-shadowGuess.test.js),
 *    not as a full site-wide translation (out of scope per the PRD: "no
 *    traducción a idiomas adicionales"). So the completeness contract is:
 *      a) every key path any non-default locale defines MUST also exist in
 *         es.json -- the default locale can never be missing something
 *         another locale promises;
 *      b) for a top-level section that is already translated into more than
 *         one locale, that section's key paths must match EXACTLY across
 *         every locale that translates it -- once bilingual, a section can
 *         never drift out of sync again.
 *    This generalizes the ad hoc per-mode parity tests into one gate that
 *    automatically covers every current and future bilingual section.
 *
 * 2. Absence of hardcoded visible-text literals in public/scripts/*.js.
 *    Scans every browser-loaded script for string/template literals that
 *    look like a natural-language phrase (2+ alphabetic words), excluding
 *    developer-only diagnostics (thrown/logged/validation error messages,
 *    which are never rendered or announced to the player) and non-prose
 *    tokens (CSS class lists, markup, single technical words).
 */

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.resolve(__dirname, '../public/i18n');
const SCRIPTS_DIR = path.resolve(__dirname, '../public/scripts');

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

function getByPath(node, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current[key], node);
}

function loadLocales() {
  const files = fs.readdirSync(I18N_DIR).filter((name) => name.endsWith('.json'));
  return files.reduce((locales, file) => {
    const localeName = path.basename(file, '.json');
    locales[localeName] = JSON.parse(fs.readFileSync(path.join(I18N_DIR, file), 'utf-8'));
    return locales;
  }, {});
}

describe('i18n key completeness across public/i18n locales', () => {
  const locales = loadLocales();
  const localeNames = Object.keys(locales).sort();
  const { DEFAULT_LOCALE } = require('../src/i18n');

  test('at least the default locale and one other locale file exist', () => {
    expect(localeNames).toContain(DEFAULT_LOCALE);
    expect(localeNames.length).toBeGreaterThan(1);
  });

  test(`${DEFAULT_LOCALE}.json defines every key path present in any other locale file`, () => {
    const defaultPaths = new Set(collectLeafPaths(locales[DEFAULT_LOCALE], ''));
    localeNames
      .filter((locale) => locale !== DEFAULT_LOCALE)
      .forEach((locale) => {
        collectLeafPaths(locales[locale], '').forEach((leafPath) => {
          expect(defaultPaths.has(leafPath)).toBe(true);
        });
      });
  });

  const objectSections = Object.keys(locales[DEFAULT_LOCALE]).filter((section) => {
    const value = locales[DEFAULT_LOCALE][section];
    return value && typeof value === 'object' && !Array.isArray(value);
  });

  const sharedSections = objectSections.filter(
    (section) => localeNames.filter((locale) => locales[locale][section] !== undefined).length > 1
  );

  test('at least one section is currently translated into more than one locale', () => {
    expect(sharedSections.length).toBeGreaterThan(0);
  });

  describe.each(sharedSections)('bilingual section "%s"', (section) => {
    const localesWithSection = localeNames.filter((locale) => locales[locale][section] !== undefined);

    test('defines the exact same key paths in every locale that translates it', () => {
      const [referenceLocale, ...restLocales] = localesWithSection;
      const referencePaths = collectLeafPaths(locales[referenceLocale][section], '').sort();
      restLocales.forEach((locale) => {
        const paths = collectLeafPaths(locales[locale][section], '').sort();
        expect(paths).toEqual(referencePaths);
      });
    });

    test('no visible string is empty in any locale that translates it', () => {
      localesWithSection.forEach((locale) => {
        collectLeafPaths(locales[locale][section], '').forEach((leafPath) => {
          const value = getByPath(locales[locale][section], leafPath);
          expect(typeof value).toBe('string');
          expect(value.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });
});

describe('no hardcoded visible-text literals in public/scripts/*.js', () => {
  // Matches, in source order, block comments / line comments / single- and
  // double-quoted strings / template literals. Comments are matched first so
  // markup or prose inside a JSDoc comment (e.g. a `//` inside a quoted URL
  // example) is consumed as part of the comment token and never re-parsed as
  // a separate string -- see the file doc comment.
  const TOKEN_RE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

  // A "visible phrase" is plain prose: letters/digits/spaces and ordinary
  // punctuation only (no braces, angle brackets, slashes, `=`) with at least
  // two alphabetic words. This naturally excludes CSS class lists, markup
  // strings, template-literal interpolation (`${...}`), file paths and
  // BEM-style tokens (which also carry a telltale "__").
  const WORDY_RE = /^[A-Za-zÀ-ÿ0-9 ¿?¡!.,;:'’()-]+$/;

  // Developer-only diagnostics: thrown/logged/validation-error strings are
  // never rendered or announced to the player, so they are exempt from the
  // "all visible text comes from public/i18n/" rule.
  const SINK_RE = /(?:throw\s+new\s+Error|new\s+Error|console\s*\.\s*(?:log|warn|error|info|debug)|errors\s*\.\s*push|messages\s*\.\s*push)\s*\(/g;
  const CONTRACT_PHRASING_RE = /\b(must be|requires|is not available|is unavailable|not implemented|failed to|not found)\b/i;
  const SINK_LOOKBACK = 600;

  function looksLikeVisiblePhrase(value) {
    const trimmed = value.trim();
    if (trimmed.length < 8 || trimmed.includes('__')) return false;
    if (!WORDY_RE.test(trimmed)) return false;
    const words = trimmed.split(/\s+/).filter((word) => /[A-Za-zÀ-ÿ]{2,}/.test(word));
    return words.length >= 2;
  }

  function isDeveloperDiagnostic(src, tokenIndex) {
    const windowStart = Math.max(0, tokenIndex - SINK_LOOKBACK);
    const window = src.slice(windowStart, tokenIndex);
    let lastSinkEnd = -1;
    let match;
    SINK_RE.lastIndex = 0;
    while ((match = SINK_RE.exec(window))) {
      lastSinkEnd = match.index + match[0].length;
    }
    if (lastSinkEnd === -1) return false;
    // Still inside that call's arguments as long as the statement hasn't
    // been terminated since the sink call opened.
    return !window.slice(lastSinkEnd).includes(';');
  }

  function findEmbeddedVisibleLiterals(src) {
    const hits = [];
    let match;
    TOKEN_RE.lastIndex = 0;
    while ((match = TOKEN_RE.exec(src))) {
      const token = match[0];
      if (token.startsWith('/*') || token.startsWith('//')) continue;
      const value = token.slice(1, -1);
      if (value === 'use strict') continue;
      if (!looksLikeVisiblePhrase(value)) continue;
      if (isDeveloperDiagnostic(src, match.index)) continue;
      if (CONTRACT_PHRASING_RE.test(value)) continue;
      hits.push(value);
    }
    return hits;
  }

  const scriptFiles = fs.readdirSync(SCRIPTS_DIR).filter((name) => name.endsWith('.js'));

  test('public/scripts/ has at least one script to scan', () => {
    expect(scriptFiles.length).toBeGreaterThan(0);
  });

  test.each(scriptFiles)('%s has no hardcoded visible-text string literal', (fileName) => {
    const src = fs.readFileSync(path.join(SCRIPTS_DIR, fileName), 'utf-8');
    expect(findEmbeddedVisibleLiterals(src)).toEqual([]);
  });
});
