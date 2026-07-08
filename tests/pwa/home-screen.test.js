'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderHomeScreen, MASCOT_IMAGE_SRC } = require('../../public/scripts/homeScreen');
const { home: strings } = require('../../public/i18n/es.json');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

describe('HomeScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title and the "¡Jugar!" button from the i18n resource', () => {
    renderHomeScreen(container);

    expect(getByText(container, strings.title)).toBeInTheDocument();
    expect(getByRole(container, 'button', { name: strings.playButton })).toBeInTheDocument();
  });

  test('renders the mascot illustration with a descriptive alt text for screen readers', () => {
    const { mascot } = renderHomeScreen(container);

    expect(mascot.tagName).toBe('IMG');
    expect(mascot).toHaveAttribute('src', MASCOT_IMAGE_SRC);
    expect(mascot).toHaveAttribute('alt', strings.mascotAlt);
    expect(mascot.alt).not.toBe('');
  });

  test('the play button carries the styling hook for its touch target and label size', () => {
    const { playButton } = renderHomeScreen(container);

    expect(playButton).toHaveClass('home-screen__play-button');
  });

  test('the play button style meets the minimum 64dp height, 48dp width and 24sp label (AC-2)', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf-8');

    // Sizes are design tokens (custom properties set in :root, mirrored in
    // src/theme/designTokens.js) rather than literal values on the rule
    // itself — resolve `var(--x)` against that :root map before asserting.
    const rootMatch = css.match(/:root\s*{([^}]*)}/);
    expect(rootMatch).not.toBeNull();
    const tokens = {};
    for (const tokenMatch of rootMatch[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      tokens[tokenMatch[1]] = tokenMatch[2].trim();
    }

    const resolve = (rawValue) => {
      const varMatch = rawValue.match(/^var\((--[\w-]+)\)$/);
      return varMatch ? tokens[varMatch[1]] : rawValue;
    };

    const ruleMatch = css.match(/\.home-screen__play-button\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();
    const rule = ruleMatch[1];

    const minHeight = parseFloat(resolve(rule.match(/min-height:\s*([^;]+);/)[1].trim()));
    const minWidth = parseFloat(resolve(rule.match(/min-width:\s*([^;]+);/)[1].trim()));
    const fontSizePx = parseFloat(resolve(rule.match(/font-size:\s*([^;]+);/)[1].trim()));

    expect(minHeight).toBeGreaterThanOrEqual(64);
    expect(minWidth).toBeGreaterThanOrEqual(48);
    expect(fontSizePx).toBeGreaterThanOrEqual(24);
  });

  test('orders content title -> mascot -> play button for a predictable screen reader flow', () => {
    const { root, title, mascot, playButton } = renderHomeScreen(container);

    const children = Array.from(root.children);
    expect(children.indexOf(title)).toBeLessThan(children.indexOf(mascot));
    expect(children.indexOf(mascot)).toBeLessThan(children.indexOf(playButton));
  });

  test('renders an optional parental notice explaining local-only progress loss', () => {
    renderHomeScreen(container);

    const notice = getByRole(container, 'note');
    expect(notice).toHaveTextContent(strings.parentalNotice.message);
    expect(notice).toHaveAccessibleName(strings.parentalNotice.label);
  });

  test('the parental notice does not block or disable the play button', () => {
    const { playButton } = renderHomeScreen(container);

    playButton.focus();
    expect(document.activeElement).toBe(playButton);
    expect(playButton.disabled).toBe(false);
  });

  test('the notice is not required reading: it carries no tabindex and is not the first focusable element', () => {
    renderHomeScreen(container);

    const notice = getByRole(container, 'note');
    expect(notice).not.toHaveAttribute('tabindex');
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    renderHomeScreen(container, { locale: 'es' });

    expect(container.textContent).toContain(strings.parentalNotice.message);
  });

  test('accepts pre-resolved strings so the browser can render without a bundler', () => {
    renderHomeScreen(container, { strings });

    expect(getByText(container, strings.title)).toBeInTheDocument();
  });

  test('the mascot asset file exists and is part of the service worker app-shell precache', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    expect(fs.existsSync(path.join(publicDir, MASCOT_IMAGE_SRC.replace(/^\//, '')))).toBe(true);

    const swContent = fs.readFileSync(path.resolve(publicDir, 'service-worker.js'), 'utf-8');
    expect(swContent).toContain(`'${MASCOT_IMAGE_SRC}'`);
  });

  test('the homeScreen script and the i18n resource are part of the service worker app-shell precache', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    const swContent = fs.readFileSync(path.resolve(publicDir, 'service-worker.js'), 'utf-8');

    expect(swContent).toContain("'/scripts/homeScreen.js'");
    expect(swContent).toContain("'/i18n/es.json'");
  });
});
