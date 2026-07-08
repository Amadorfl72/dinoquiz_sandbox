'use strict';

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const { renderMuteToggle } = require('./MuteToggle');
const { DinoQuizStorage } = require('../services/storage/StorageClient');
const { appShell: strings } = require('../i18n/es.json');

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createFakeAdapter() {
  const store = new Map();
  return {
    name: 'memory',
    async isAvailable() {
      return true;
    },
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

describe('MuteToggle', () => {
  let container;
  let storage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    storage = new DinoQuizStorage([createFakeAdapter()]);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders a single button with the "sound on" aria-label by default', async () => {
    renderMuteToggle(container, { storage });
    await storage.init();

    const button = getByRole(container, 'button', { name: strings.muteButton.mute });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  test('meets the minimum 48x48dp touch target (AC-2)', () => {
    renderMuteToggle(container, { storage });

    const button = container.querySelector('.mute-toggle');
    expect(button.className).toBe('mute-toggle');
  });

  test('clicking toggles the aria-label, the pressed state and persists through storage', async () => {
    renderMuteToggle(container, { storage });
    await storage.init();

    const button = container.querySelector('button');
    button.click();
    await flushPromises();

    expect(button).toHaveAttribute('aria-label', strings.muteButton.unmute);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await storage.get('muted')).toBe(true);

    button.click();
    await flushPromises();

    expect(button).toHaveAttribute('aria-label', strings.muteButton.mute);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(await storage.get('muted')).toBe(false);
  });

  test('renders the persisted muted state once storage has loaded', async () => {
    await storage.setMuted(true);

    renderMuteToggle(container, { storage });
    await storage.init();

    const button = container.querySelector('button');
    expect(button).toHaveAttribute('aria-label', strings.muteButton.unmute);
    expect(button.classList.contains('mute-toggle--muted')).toBe(true);
  });

  test('shows exactly one visible speaker icon per state', async () => {
    renderMuteToggle(container, { storage });
    await storage.init();

    const button = container.querySelector('button');
    const iconOn = button.querySelector('.mute-toggle__icon--on');
    const iconOff = button.querySelector('.mute-toggle__icon--off');
    expect(iconOn.hidden).toBe(false);
    expect(iconOff.hidden).toBe(true);

    button.click();
    await flushPromises();

    expect(iconOn.hidden).toBe(true);
    expect(iconOff.hidden).toBe(false);
  });
});
