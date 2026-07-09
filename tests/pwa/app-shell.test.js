'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const { renderMuteToggleButton, MUTE_STORAGE_KEY } = require('../../public/scripts/appShell');
const { muteButton: strings } = require('../../public/i18n/es.json');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

describe('TRIOFSND-105: global mute toggle', () => {
  let container;
  let storage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    storage = createMemoryStorage();
  });

  afterEach(() => {
    container.remove();
  });

  test('defaults to unmuted with the "Silenciar sonido" label', () => {
    renderMuteToggleButton(container, { strings, storage });

    const button = getByRole(container, 'button', { name: strings.muteLabel });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  test('switches to the "Activar sonido" label and persists the muted state on click', () => {
    renderMuteToggleButton(container, { strings, storage });

    getByRole(container, 'button', { name: strings.muteLabel }).click();

    const button = getByRole(container, 'button', { name: strings.unmuteLabel });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(storage.getItem(MUTE_STORAGE_KEY)).toBe('true');
  });

  test('toggles back to "Silenciar sonido" on a second click', () => {
    renderMuteToggleButton(container, { strings, storage });

    getByRole(container, 'button', { name: strings.muteLabel }).click();
    getByRole(container, 'button', { name: strings.unmuteLabel }).click();

    const button = getByRole(container, 'button', { name: strings.muteLabel });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(storage.getItem(MUTE_STORAGE_KEY)).toBe('false');
  });

  test('resumes the previously persisted muted state on the next render', () => {
    storage.setItem(MUTE_STORAGE_KEY, 'true');

    renderMuteToggleButton(container, { strings, storage });

    expect(getByRole(container, 'button', { name: strings.unmuteLabel })).toHaveAttribute('aria-pressed', 'true');
  });

  test('notifies onToggle with the new muted state', () => {
    const onToggle = jest.fn();
    renderMuteToggleButton(container, { strings, storage, onToggle });

    getByRole(container, 'button', { name: strings.muteLabel }).click();

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  test('the button carries the styling hook for its two visual states', () => {
    renderMuteToggleButton(container, { strings, storage });
    const button = getByRole(container, 'button', { name: strings.muteLabel });
    expect(button).toHaveClass('app-shell__mute-toggle', 'app-shell__mute-toggle--unmuted');

    button.click();
    expect(button).toHaveClass('app-shell__mute-toggle', 'app-shell__mute-toggle--muted');
  });

  test('the mute toggle meets the minimum 48x48dp touch target (AC-2)', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf-8');
    const ruleMatch = css.match(/\.app-shell__mute-toggle\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();

    const rule = ruleMatch[1];
    const minWidth = parseFloat(rule.match(/min-width:\s*([\d.]+)px/)[1]);
    const minHeight = parseFloat(rule.match(/min-height:\s*([\d.]+)px/)[1]);

    expect(minWidth).toBeGreaterThanOrEqual(48);
    expect(minHeight).toBeGreaterThanOrEqual(48);
  });

  test('accepts pre-resolved strings so the browser can render without a bundler', () => {
    renderMuteToggleButton(container, { strings, storage });
    expect(getByRole(container, 'button', { name: strings.muteLabel })).toBeInTheDocument();
  });
});

describe('TRIOFSND-105: app shell mounting', () => {
  test('index.html has a mute-toggle container that lives outside #app, so screen re-renders never wipe it', () => {
    const doc = new DOMParser().parseFromString(fs.readFileSync(INDEX_PATH, 'utf-8'), 'text/html');

    const muteToggle = doc.getElementById('mute-toggle');
    const app = doc.getElementById('app');

    expect(muteToggle).not.toBeNull();
    expect(app).not.toBeNull();
    expect(app.contains(muteToggle)).toBe(false);
    expect(muteToggle.contains(app)).toBe(false);
  });

  test('index.html loads the app-shell script before the bootstrap script', () => {
    const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
    const appShellIndex = indexHtml.indexOf('/scripts/appShell.js');
    const mainIndex = indexHtml.indexOf('/scripts/main.js');

    expect(appShellIndex).toBeGreaterThan(-1);
    expect(appShellIndex).toBeLessThan(mainIndex);
  });

  test('the app-shell script is part of the service worker app-shell precache', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    const swContent = fs.readFileSync(path.resolve(publicDir, 'service-worker.js'), 'utf-8');

    expect(swContent).toContain("'/scripts/appShell.js'");
  });

  test('the mute toggle strings live in the shared i18n resource, not hardcoded (AC-15)', () => {
    expect(strings.muteLabel).toBe('Silenciar sonido');
    expect(strings.unmuteLabel).toBe('Activar sonido');
  });
});

describe('TRIOFSND-105: main.js wires the mute toggle into the app shell on load', () => {
  const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');

  test('renderMuteToggle mounts into #mute-toggle using the fetched i18n resource', async () => {
    const { renderMuteToggle } = require(MAIN_JS_PATH);
    const muteToggleContainer = { id: 'mute-toggle' };
    const doc = { getElementById: jest.fn().mockReturnValue(muteToggleContainer) };
    const renderMuteToggleButtonFn = jest.fn();
    const muteButtonStrings = { muteLabel: 'Silenciar sonido', unmuteLabel: 'Activar sonido' };
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ muteButton: muteButtonStrings }),
    });

    await renderMuteToggle(doc, renderMuteToggleButtonFn, fetchFn);

    expect(doc.getElementById).toHaveBeenCalledWith('mute-toggle');
    expect(renderMuteToggleButtonFn).toHaveBeenCalledWith(muteToggleContainer, { strings: muteButtonStrings });
  });

  test('renderMuteToggle resolves to null without a #mute-toggle container', async () => {
    const { renderMuteToggle } = require(MAIN_JS_PATH);
    const doc = { getElementById: jest.fn().mockReturnValue(null) };
    const renderMuteToggleButtonFn = jest.fn();

    const result = await renderMuteToggle(doc, renderMuteToggleButtonFn, jest.fn());

    expect(result).toBeNull();
    expect(renderMuteToggleButtonFn).not.toHaveBeenCalled();
  });
});
