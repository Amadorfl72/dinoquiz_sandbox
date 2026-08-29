'use strict';

/**
 * TRIOFSND-313: automated WCAG AA contrast audit (PRD constraint "El texto
 * debe cumplir WCAG AA con una relación de contraste mínima de 4.5:1").
 *
 * tests/e2e/accessibility.test.js already covers this with axe-core in a
 * real Chromium instance, because jsdom's `getComputedStyle` does not
 * implement CSS cascade/inheritance for stylesheet rules (only literal
 * inline styles resolve reliably there) -- see that file's header comment.
 * This test takes a different, dependency-light path so the check also
 * runs as a plain jsdom unit test: it renders the same three screens, then
 * resolves each visible text block's effective color/background *itself*
 * by parsing public/styles/main.css (the single source of truth for these
 * colors) and re-implementing just enough of the CSS cascade -- selector
 * matching via the DOM's own `Element.matches()`, specificity + source
 * order for conflicting declarations, and inheritance/see-through-
 * transparency by walking up the tree -- to know what a browser would
 * paint. `src/theme/contrast.js` (already used by contrast.test.js for the
 * hand-maintained color-token modules) does the ratio math.
 *
 * Scope is deliberately the *default*, non-hover/non-focus rendering of
 * each screen (plus the handful of reachable states exercised below, e.g.
 * an answered question or an open home-screen panel): `Element.matches()`
 * naturally never matches `:hover`/`:focus-visible`/`:active` against a
 * freshly rendered, uninteracted element, so those states are out of scope
 * here exactly as they are for a static render. Disabled controls are
 * skipped too, per WCAG's explicit exemption for inactive UI components
 * (the dimmed "Siguiente" button while it debounces is never legible text
 * a player is meant to read, only a temporarily inert control).
 */

const fs = require('fs');
const path = require('path');

const { contrastRatio, WCAG_AA_NORMAL_TEXT } = require('../../src/theme/contrast');
const { renderHomeScreen } = require('../../public/scripts/homeScreen');
const { renderQuestionScreen } = require('../../public/scripts/questionScreen');
const { renderResultsScreen } = require('../../public/scripts/resultsScreen');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

// ---------------------------------------------------------------------
// Minimal CSS engine, scoped to what this stylesheet actually uses: plain
// class/attribute/pseudo-class selectors, `color`/`background-color`
// declarations (never the `background` shorthand -- there is none in this
// file), and `var(--token)` custom properties declared in `:root`.
// ---------------------------------------------------------------------

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Parses top-level rules, skipping @media/@supports/@keyframes bodies entirely (base, mobile-first rules only -- matching the 375px no-scroll target). */
function parseTopLevelRules(css) {
  const rules = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i += 1;
    if (i >= n) break;
    if (css[i] === '@') {
      const braceIndex = css.indexOf('{', i);
      const semiIndex = css.indexOf(';', i);
      if (braceIndex === -1) break;
      if (semiIndex !== -1 && semiIndex < braceIndex) {
        i = semiIndex + 1;
        continue;
      }
      let depth = 0;
      let j = braceIndex;
      for (; j < n; j += 1) {
        if (css[j] === '{') depth += 1;
        else if (css[j] === '}') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
        }
      }
      i = j;
      continue;
    }
    const braceIndex = css.indexOf('{', i);
    if (braceIndex === -1) break;
    const selectorText = css.slice(i, braceIndex).trim();
    const closeIndex = css.indexOf('}', braceIndex);
    if (closeIndex === -1) break;
    const body = css.slice(braceIndex + 1, closeIndex);
    rules.push({ selectorText, body, order: rules.length });
    i = closeIndex + 1;
  }
  return rules;
}

function parseDeclarations(body) {
  const decls = {};
  body.split(';').forEach((chunk) => {
    const idx = chunk.indexOf(':');
    if (idx === -1) return;
    const prop = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (!prop || !value) return;
    decls[prop] = value;
  });
  return decls;
}

/** Approximate (id, class-or-attribute-or-pseudo-class, type-or-pseudo-element) specificity, enough for this file's BEM-flat selectors. */
function computeSpecificity(selector) {
  let s = selector;
  const idCount = (s.match(/#[\w-]+/g) || []).length;
  s = s.replace(/#[\w-]+/g, ' ');
  const classCount = (s.match(/\.[\w-]+/g) || []).length;
  s = s.replace(/\.[\w-]+/g, ' ');
  const attrCount = (s.match(/\[[^\]]*\]/g) || []).length;
  s = s.replace(/\[[^\]]*\]/g, ' ');
  const pseudoElementCount = (s.match(/::[\w-]+/g) || []).length;
  s = s.replace(/::[\w-]+/g, ' ');
  const pseudoClassCount = (s.match(/:[\w-]+(\([^)]*\))?/g) || []).length;
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, ' ');
  const typeCount = (s.match(/[a-zA-Z][\w-]*/g) || []).length + pseudoElementCount;
  return [idCount, classCount + attrCount + pseudoClassCount, typeCount];
}

function compareSpecificity(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function flattenRules(rules) {
  const flat = [];
  rules.forEach((rule) => {
    if (!rule.selectorText) return;
    const decls = parseDeclarations(rule.body);
    if (!('color' in decls) && !('background-color' in decls)) return;
    rule.selectorText
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean)
      .forEach((selector) => {
        flat.push({ selector, decls, order: rule.order, specificity: computeSpecificity(selector) });
      });
  });
  return flat;
}

function extractRootTokens(css) {
  const tokens = {};
  const rootRegex = /:root\s*\{([^}]*)\}/g;
  let match = rootRegex.exec(css);
  while (match) {
    Array.from(match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)).forEach((tokenMatch) => {
      tokens[tokenMatch[1]] = tokenMatch[2].trim();
    });
    match = rootRegex.exec(css);
  }
  return tokens;
}

function resolveVars(value, tokens) {
  return value.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (fullMatch, name, fallback) => {
    const key = name.slice(2);
    if (Object.prototype.hasOwnProperty.call(tokens, key)) return tokens[key];
    return fallback !== undefined ? fallback.trim() : fullMatch;
  });
}

function normalizeHex(hex) {
  const body = hex.slice(1);
  if (body.length === 3) {
    return `#${body.split('').map((char) => char + char).join('')}`;
  }
  return `#${body}`;
}

/** Resolves a declaration value to a hex color, or null for keywords ("transparent"/"inherit"/"currentcolor") that must fall through to an ancestor. */
function colorToHex(rawValue) {
  const value = rawValue.trim().toLowerCase();
  if (value === 'transparent' || value === 'inherit' || value === 'currentcolor') return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) return normalizeHex(value);
  const rgbMatch = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)$/);
  if (rgbMatch) {
    const channels = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map((n) => Math.round(parseFloat(n)));
    return `#${channels.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
}

/** Higher specificity always wins; a tie goes to the later source-order rule (real cascade behavior). */
function isBetterMatch(candidate, currentBest) {
  if (!currentBest) return true;
  const cmp = compareSpecificity(candidate.specificity, currentBest.specificity);
  if (cmp !== 0) return cmp > 0;
  return candidate.order > currentBest.order;
}

function resolveDeclared(flatRules, element, property) {
  let best = null;
  flatRules.forEach((entry) => {
    if (!(property in entry.decls)) return;
    let isMatch = false;
    try {
      isMatch = element.matches(entry.selector);
    } catch (error) {
      isMatch = false;
    }
    if (!isMatch) return;
    if (isBetterMatch(entry, best)) best = entry;
  });
  return best ? best.decls[property] : null;
}

/**
 * Walks from `element` up to <html>, returning the first resolvable hex
 * color for `property`. This single walk works for both `color` (a real
 * inheritance chain) and `background-color` (which doesn't inherit, but a
 * `transparent` box shows its parent's painted background through it) --
 * both cases stop climbing at the same point: the nearest ancestor with an
 * actually-painted value.
 */
function resolveEffectiveColor(flatRules, tokens, element, property) {
  let current = element;
  while (current) {
    const declared = resolveDeclared(flatRules, current, property);
    if (declared) {
      const hex = colorToHex(resolveVars(declared, tokens));
      if (hex) return hex;
    }
    current = current.parentElement;
  }
  return null;
}

function collectVisibleTextBlocks(root) {
  const blocks = [];
  [root, ...root.querySelectorAll('*')].forEach((element) => {
    const hasOwnText = Array.from(element.childNodes).some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 0
    );
    if (!hasOwnText) return;
    if (element.closest('[hidden]')) return;
    if (element.closest('[aria-hidden="true"]')) return;
    if (element.closest('.sr-only')) return;
    if (element.disabled || element.closest('[disabled]')) return;
    blocks.push(element);
  });
  return blocks;
}

function auditScreen(flatRules, tokens, container, screenLabel) {
  return collectVisibleTextBlocks(container).map((element) => {
    const color = resolveEffectiveColor(flatRules, tokens, element, 'color') || '#000000';
    const background = resolveEffectiveColor(flatRules, tokens, element, 'background-color') || '#ffffff';
    return {
      screen: screenLabel,
      selector: element.className || element.tagName,
      text: element.textContent.trim().slice(0, 60),
      color,
      background,
      ratio: contrastRatio(color, background),
    };
  });
}

function belowThreshold(results) {
  return results
    .filter((result) => result.ratio < WCAG_AA_NORMAL_TEXT)
    .map((result) => `${result.screen} ${result.selector} "${result.text}" ${result.color} on ${result.background} = ${result.ratio.toFixed(2)}:1`);
}

describe('TRIOFSND-313: automated 4.5:1 contrast audit for the main screens', () => {
  const css = stripComments(fs.readFileSync(MAIN_CSS_PATH, 'utf8'));
  const tokens = extractRootTokens(css);
  const flatRules = flattenRules(parseTopLevelRules(css));

  let container;
  let originalAudio;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // jsdom has no real media playback; answering a question plays a sound
    // (public/scripts/soundService.js), which would otherwise log a noisy
    // "not implemented: HTMLMediaElement.prototype.play" per click -- same
    // stub QuestionScreen.test.js uses.
    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    container.remove();
    window.Audio = originalAudio;
  });

  test('homeScreen: default play state plus the discoverable panels/tooltip/best-score rows all meet 4.5:1', () => {
    const rendered = renderHomeScreen(container, {
      muted: false,
      showTooltip: true,
      bestScore: 10,
      bestStreak: 5,
      discoveredFunFactsCount: 3,
      totalFunFacts: 10,
    });
    // The privacy/purchase disclosures start closed (`hidden`); open them so
    // their real, user-visible copy is part of the audit instead of being
    // skipped as hidden content.
    rendered.privacyPanel.hidden = false;
    rendered.purchasePanel.hidden = false;

    const results = auditScreen(flatRules, tokens, container, 'homeScreen');
    expect(results.length).toBeGreaterThan(0);
    expect(belowThreshold(results)).toEqual([]);
  });

  describe('questionScreen', () => {
    function buildQuestion() {
      return {
        id: 'trex-01',
        dinosaur: 'trex',
        question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
        options: ['Solo de plantas', 'De carne, ¡era un gran cazador!', 'Solo de insectos', 'De algas del mar'],
        correctAnswerIndex: 1,
        funFact: 'El T-Rex tenía la mordida más fuerte de todos los dinosaurios carnívoros conocidos.',
        image: 'dinosaurs/trex.png',
      };
    }

    test('unanswered state (prompt, score, level/progress badges, four option colors) meets 4.5:1', () => {
      renderQuestionScreen(container, buildQuestion(), { questionNumber: 1, level: 2 });

      const results = auditScreen(flatRules, tokens, container, 'questionScreen (unanswered)');
      expect(results.length).toBeGreaterThan(0);
      expect(belowThreshold(results)).toEqual([]);
    });

    test('answered correctly (feedback + dato curioso box) meets 4.5:1', () => {
      const question = buildQuestion();
      const { optionButtons } = renderQuestionScreen(container, question);
      optionButtons[question.correctAnswerIndex].click();

      const results = auditScreen(flatRules, tokens, container, 'questionScreen (correct)');
      expect(results.length).toBeGreaterThan(0);
      expect(belowThreshold(results)).toEqual([]);
    });

    test('answered incorrectly (neutral picked option + highlighted correct option) meets 4.5:1', () => {
      const question = buildQuestion();
      const { optionButtons } = renderQuestionScreen(container, question);
      const wrongIndex = question.correctAnswerIndex === 0 ? 1 : 0;
      optionButtons[wrongIndex].click();

      const results = auditScreen(flatRules, tokens, container, 'questionScreen (incorrect)');
      expect(results.length).toBeGreaterThan(0);
      expect(belowThreshold(results)).toEqual([]);
    });
  });

  test('resultsScreen: score, stars, level, message and every optional progress row meet 4.5:1', () => {
    renderResultsScreen(container, {
      score: 7,
      level: 2,
      maxLevelUnlocked: 3,
      bestScore: 9,
      bestStreak: 4,
      discoveredFunFactsCount: 6,
      totalFunFacts: 10,
      levelOutcome: 'advanced',
    });

    const results = auditScreen(flatRules, tokens, container, 'resultsScreen');
    expect(results.length).toBeGreaterThan(0);
    expect(belowThreshold(results)).toEqual([]);
  });
});
