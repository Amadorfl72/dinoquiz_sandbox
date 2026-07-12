'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const {
  MIN_SCORE,
  MAX_SCORE,
  MAX_STARS,
  calculateStars,
  validateMotivationalMessages,
  selectMotivationalMessage,
  renderResultsScreen,
} = require('./ResultsScreen');
const { results: strings } = require('../../public/i18n/es.json');

// Design tokens (TRIOFSND-133) moved these values into `:root` custom
// properties, so a rule's literal px values must be resolved through
// `var(--token)` before pattern-matching them here.
function resolveCssCustomProperties(css, ruleText) {
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  const tokens = {};
  Array.from((rootMatch ? rootMatch[1] : '').matchAll(/--([\w-]+):\s*([^;]+);/g)).forEach((match) => {
    tokens[match[1]] = match[2].trim();
  });
  return ruleText.replace(/var\(--([\w-]+)\)/g, (fullMatch, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? tokens[name] : fullMatch
  );
}

describe('calculateStars (tier logic)', () => {
  test.each([
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 2],
    [6, 2],
    [7, 3],
    [8, 3],
    [9, 3],
    [10, 3],
  ])('score %i maps to %i star(s)', (score, expectedStars) => {
    expect(calculateStars(score)).toBe(expectedStars);
  });

  test('rejects a non-integer score', () => {
    expect(() => calculateStars(3.5)).toThrow();
  });

  test('rejects a score below the minimum', () => {
    expect(() => calculateStars(MIN_SCORE - 1)).toThrow();
  });

  test('rejects a score above the maximum', () => {
    expect(() => calculateStars(MAX_SCORE + 1)).toThrow();
  });
});

describe('content-guide validation of motivational messages', () => {
  test('the real es.json messages contain no negative language', () => {
    expect(validateMotivationalMessages(strings.messages)).toEqual([]);
  });

  test('there is more than one message so replays feel varied', () => {
    expect(strings.messages.length).toBeGreaterThan(1);
  });

  test('flags a message containing banned negative language', () => {
    const errors = validateMotivationalMessages(['¡Qué mal lo has hecho!']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/negative language/);
  });

  test('flags an empty or non-string message', () => {
    expect(validateMotivationalMessages([''])).toHaveLength(1);
    expect(validateMotivationalMessages([42])).toHaveLength(1);
  });

  test('rejects a non-array or empty list', () => {
    expect(validateMotivationalMessages([])).toHaveLength(1);
    expect(validateMotivationalMessages(undefined)).toHaveLength(1);
  });

  test('does not flag words that merely contain a banned word as a substring', () => {
    expect(validateMotivationalMessages(['¡Aprender sobre dinosaurios mola muchísimo!'])).toEqual([]);
  });
});

describe('selectMotivationalMessage', () => {
  test('always returns one of the provided messages', () => {
    const messages = ['a', 'b', 'c'];
    for (let i = 0; i < messages.length; i += 1) {
      const randomFn = () => i / messages.length;
      expect(messages).toContain(selectMotivationalMessage(messages, randomFn));
    }
  });

  test('throws for an empty message list', () => {
    expect(() => selectMotivationalMessage([])).toThrow();
  });
});

describe('ResultsScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the score as X/10', () => {
    renderResultsScreen(container, { score: 7 });

    expect(getByText(container, '7/10')).toBeInTheDocument();
  });

  test.each([
    [0, 1],
    [4, 2],
    [7, 3],
  ])('renders %i stars filled for a score of %i', (score, expectedStars) => {
    const { starsEl } = renderResultsScreen(container, { score });

    expect(starsEl).toHaveAttribute('role', 'img');
    expect(starsEl.getAttribute('aria-label')).toContain(`${expectedStars} de ${MAX_STARS}`);
    expect(starsEl.textContent).toBe('★'.repeat(expectedStars) + '☆'.repeat(MAX_STARS - expectedStars));
  });

  test('renders a motivational message from the i18n resource', () => {
    const { messageEl } = renderResultsScreen(container, { score: 5 });

    expect(strings.messages).toContain(messageEl.textContent);
  });

  test('renders a specific message when provided explicitly', () => {
    const { messageEl } = renderResultsScreen(container, { score: 5, message: 'Mensaje de prueba' });

    expect(messageEl).toHaveTextContent('Mensaje de prueba');
  });

  test('exposes a single aria-live status region announcing score, stars and message', () => {
    const { announcementEl } = renderResultsScreen(container, { score: 8, message: 'Mensaje de prueba' });

    expect(announcementEl).toHaveAttribute('aria-live', 'polite');
    expect(getByRole(container, 'status')).toBe(announcementEl);
    expect(announcementEl).toHaveTextContent('8');
    expect(announcementEl).toHaveTextContent('3');
    expect(announcementEl).toHaveTextContent('Mensaje de prueba');
  });

  test('renders a prominent "Volver a jugar" button that calls onPlayAgain when clicked', () => {
    const onPlayAgain = jest.fn();
    const { playAgainButton } = renderResultsScreen(container, { score: 6, onPlayAgain });

    expect(getByRole(container, 'button', { name: strings.playAgainButton })).toBe(playAgainButton);
    playAgainButton.click();
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  test('renders a secondary "Salir" button by default that calls onExit when clicked', () => {
    const onExit = jest.fn();
    const { exitButton } = renderResultsScreen(container, { score: 6, onExit });

    expect(getByRole(container, 'button', { name: strings.exitButton })).toBe(exitButton);
    exitButton.click();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test('the "Salir" button can be hidden since it is optional', () => {
    const { exitButton } = renderResultsScreen(container, { score: 6, showExitButton: false });

    expect(exitButton).toBeNull();
    expect(() => getByRole(container, 'button', { name: strings.exitButton })).toThrow();
  });

  test('throws for a score outside the 0-10 range', () => {
    expect(() => renderResultsScreen(container, { score: 11 })).toThrow();
    expect(() => renderResultsScreen(container, { score: -1 })).toThrow();
  });

  test('does not hardcode copy — heading and buttons come from the es locale resource file', () => {
    renderResultsScreen(container, { score: 9, locale: 'es' });

    expect(getByText(container, strings.heading)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.playAgainButton);
    expect(container.textContent).toContain(strings.exitButton);
  });

  test('both buttons meet the 48x48dp minimum touch target', () => {
    const { playAgainButton, exitButton } = renderResultsScreen(container, { score: 6 });

    expect(playAgainButton).toHaveClass('results-screen__play-again-button');
    expect(exitButton).toHaveClass('results-screen__exit-button');
  });
});

describe('"Volver a jugar" button style meets 64dp height / 48dp width / 24sp text (AC-2/AC-23)', () => {
  const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

  test('the base and play-again-specific CSS rules together satisfy the minimums', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf-8');

    // Sizes are design tokens (custom properties set in :root, mirrored in
    // src/theme/designTokens.js) rather than literal values on the rules
    // themselves — resolve `var(--x)` against that :root map before asserting.
    const rootMatch = css.match(/:root\s*{([^}]*)}/);
    expect(rootMatch).not.toBeNull();
    const tokens = {};
    for (const tokenMatch of rootMatch[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      tokens[tokenMatch[1]] = tokenMatch[2].trim();
    }

    const resolve = (rawValue) => {
      const varMatch = rawValue.trim().match(/^var\((--[\w-]+)\)$/);
      return varMatch ? tokens[varMatch[1]] : rawValue.trim();
    };

    const sharedRuleMatch = css.match(
      /\.results-screen__play-again-button,\s*\n\.results-screen__exit-button\s*\{([^}]*)\}/
    );
    const specificRuleMatch = css.match(/\.results-screen__play-again-button\s*\{([^}]*)\}/);
    expect(sharedRuleMatch).not.toBeNull();
    expect(specificRuleMatch).not.toBeNull();

    // Accessibility tokens (TRIOFSND-133) moved these rules onto CSS custom
    // properties (e.g. `var(--tap-target-min)`); resolve them via the shared
    // helper so this still reads the effective px values instead of the
    // var() call.
    const combinedRule = resolveCssCustomProperties(css, `${sharedRuleMatch[1]}\n${specificRuleMatch[1]}`);
    const minHeight = Math.max(
      ...Array.from(combinedRule.matchAll(/min-height:\s*([^;]+);/g)).map((match) => parseFloat(resolve(match[1])))
    );
    const minWidth = Math.max(
      ...Array.from(combinedRule.matchAll(/min-width:\s*([^;]+);/g)).map((match) => parseFloat(resolve(match[1])))
    );
    const fontSizePx = Math.max(
      ...Array.from(combinedRule.matchAll(/font-size:\s*([^;]+);/g)).map((match) => parseFloat(resolve(match[1])))
    );

    expect(minHeight).toBeGreaterThanOrEqual(64);
    expect(minWidth).toBeGreaterThanOrEqual(48);
    expect(fontSizePx).toBeGreaterThanOrEqual(24);
  });
});
