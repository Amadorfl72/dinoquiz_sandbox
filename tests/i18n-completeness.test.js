'use strict';

/**
 * TRIOFSND-312: transversal completeness gate for DinoQuiz's i18n contract
 * (PRD "Nuevos Modos de Juego" -- constraint "Todo texto visible o anunciado
 * debe proceder de public/i18n/").
 *
 * Two independent checks live here:
 *
 * 1. i18n key completeness across public/i18n/*.json: every locale file
 *    under public/i18n/ MUST define the exact same set of visible key
 *    paths as every other locale file. A locale is never allowed to be
 *    missing a whole section (or a single leaf key) that another locale
 *    defines -- there is no "partially translated" exemption, so a section
 *    like modeSelector can't silently exist in es.json while being absent
 *    from en.json.
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

// Recurses through both plain objects and arrays so a key path like
// "privacyPolicy.sections[0].paragraphs[2]" is treated as its own leaf --
// arrays are not collapsed into a single opaque leaf, otherwise a locale
// could satisfy "same paths" while holding a shorter/longer array of
// paragraphs, or the "no empty string" check below would try to compare a
// whole array against `typeof value === 'string'` and always fail.
function collectLeafPaths(node, prefix) {
  if (Array.isArray(node)) {
    return node.reduce((paths, item, index) => {
      const currentPath = `${prefix}[${index}]`;
      if (item && typeof item === 'object') {
        return paths.concat(collectLeafPaths(item, currentPath));
      }
      return paths.concat([currentPath]);
    }, []);
  }
  return Object.keys(node).reduce((paths, key) => {
    const value = node[key];
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return paths.concat(collectLeafPaths(value, currentPath));
    }
    return paths.concat([currentPath]);
  }, []);
}

function getByPath(node, dottedPath) {
  const tokens = dottedPath.match(/[^.[\]]+/g);
  return tokens.reduce((current, token) => current[token], node);
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

  const defaultPaths = collectLeafPaths(locales[DEFAULT_LOCALE], '').sort();
  const otherLocaleNames = localeNames.filter((locale) => locale !== DEFAULT_LOCALE);

  test.each(otherLocaleNames)(
    `%s.json defines the exact same visible key paths as ${DEFAULT_LOCALE}.json (no missing or extra section)`,
    (locale) => {
      const localePaths = collectLeafPaths(locales[locale], '').sort();
      expect(localePaths).toEqual(defaultPaths);
    }
  );

  test.each(localeNames)('no visible string is empty in %s.json', (locale) => {
    collectLeafPaths(locales[locale], '').forEach((leafPath) => {
      const value = getByPath(locales[locale], leafPath);
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
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
  // strings, file paths and BEM-style tokens (which also carry a telltale
  // "__"). Template literals are handled specially below: their `${...}`
  // interpolations are stripped first and each remaining static text segment
  // is checked on its own, so visible copy embedded AROUND an interpolation
  // (e.g. `Best score: ${score} points`) is still detected -- the segment
  // itself must still be pure prose, which is what this regex enforces.
  const WORDY_RE = /^[A-Za-zÀ-ÿ0-9 ¿?¡!.,;:'’()-]+$/;

  // Splits a template literal's inner content on its `${...}` interpolations
  // so the surrounding static text is scanned segment by segment. A literal
  // regex (never `new RegExp(...)`) keeps the SAST gate happy; `[^{}]*` stops
  // this from swallowing text past the interpolation on the common
  // single-expression case (`${score}`, `${count} points`).
  const TEMPLATE_INTERP_RE = /\$\{[^{}]*\}/g;

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
      const inner = token.slice(1, -1);
      if (isDeveloperDiagnostic(src, match.index)) continue;
      // For template literals, strip `${...}` interpolations and inspect each
      // remaining static text segment independently, so hardcoded UI copy that
      // sits next to an interpolation is not masked by the `$`/`{`/`}` that
      // WORDY_RE forbids. Plain quoted strings have a single segment.
      const segments = token.startsWith('`')
        ? inner.split(TEMPLATE_INTERP_RE)
        : [inner];
      segments.forEach((segment) => {
        if (segment === 'use strict') return;
        if (!looksLikeVisiblePhrase(segment)) return;
        if (CONTRACT_PHRASING_RE.test(segment)) return;
        hits.push(segment.trim());
      });
    }
    return hits;
  }

  // Fixtures proving the detector's behaviour directly, independent of what
  // the real scripts happen to contain. These lock in the requirement that
  // visible copy is caught in ALL THREE literal kinds -- single-quoted,
  // double-quoted and template -- including copy embedded around a `${...}`
  // interpolation, while purely-interpolated templates and lone technical
  // tokens stay clean.
  test('detects a visible phrase inside a single-quoted string', () => {
    expect(findEmbeddedVisibleLiterals("const x = 'Best score today';"))
      .toEqual(['Best score today']);
  });

  test('detects a visible phrase inside a double-quoted string', () => {
    expect(findEmbeddedVisibleLiterals('const y = "You win the game";'))
      .toEqual(['You win the game']);
  });

  test('detects a visible phrase inside a non-interpolated template literal', () => {
    expect(findEmbeddedVisibleLiterals('const z = `Welcome to DinoQuiz`;'))
      .toEqual(['Welcome to DinoQuiz']);
  });

  test('detects the static copy of an interpolated template literal', () => {
    // The mandatory blocker fixture: the `${score}` interpolation must not
    // hide the surrounding hardcoded UI copy. The scanner splits the template
    // into static segments and flags "Best score:" rather than discarding the
    // whole literal because it contains `$`, `{` and `}`.
    expect(findEmbeddedVisibleLiterals('button.textContent = `Best score: ${score} points`;'))
      .toContain('Best score:');
  });

  test('does not flag a template made only of interpolations', () => {
    expect(findEmbeddedVisibleLiterals('const t = `${a}${b}`;')).toEqual([]);
    expect(findEmbeddedVisibleLiterals('const u = `${first} ${second}`;')).toEqual([]);
  });

  test('does not flag lone technical tokens (keys, selectors, MIME, storage)', () => {
    expect(findEmbeddedVisibleLiterals("const a = 'results.score.label';")).toEqual([]);
    expect(findEmbeddedVisibleLiterals("const b = '.mode-card';")).toEqual([]);
    expect(findEmbeddedVisibleLiterals("const c = 'image/png';")).toEqual([]);
    expect(findEmbeddedVisibleLiterals("const d = 'dinoquiz:muted';")).toEqual([]);
    expect(findEmbeddedVisibleLiterals("el.addEventListener('click', handler);")).toEqual([]);
  });

  const scriptFiles = fs.readdirSync(SCRIPTS_DIR).filter((name) => name.endsWith('.js'));

  test('public/scripts/ has at least one script to scan', () => {
    expect(scriptFiles.length).toBeGreaterThan(0);
  });

  test.each(scriptFiles)('%s has no hardcoded visible-text string literal', (fileName) => {
    const src = fs.readFileSync(path.join(SCRIPTS_DIR, fileName), 'utf-8');
    expect(findEmbeddedVisibleLiterals(src)).toEqual([]);
  });
});
