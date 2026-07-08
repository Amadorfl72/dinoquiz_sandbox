'use strict';

require('@testing-library/jest-dom');
const { getByRole, getAllByRole } = require('@testing-library/dom');

const { renderAppShell } = require('./AppShell');
const { renderHomeScreen } = require('./HomeScreen');
const { renderQuestionScreen } = require('./QuestionScreen');
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

const QUESTION = {
  question: '¿Qué comía el Triceratops?',
  options: ['Plantas', 'Carne', 'Peces'],
  correctAnswerIndex: 0,
  funFact: 'El Triceratops tenía tres cuernos.',
};

describe('AppShell', () => {
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

  test('mounts exactly one global mute toggle', async () => {
    renderAppShell(container, { storage });
    await storage.init();

    const button = getByRole(container, 'button', { name: strings.muteButton.mute });
    expect(button).toBeInTheDocument();
  });

  test('exposes a content area where screens render without duplicating the mute toggle', async () => {
    const { content } = renderAppShell(container, { storage });
    await storage.init();

    renderHomeScreen(content);
    let buttons = getAllByRole(container, 'button', { name: strings.muteButton.mute });
    expect(buttons).toHaveLength(1);

    renderQuestionScreen(content, QUESTION);
    buttons = getAllByRole(container, 'button', { name: strings.muteButton.mute });
    expect(buttons).toHaveLength(1);
  });

  test('the mute toggle keeps working once a screen is mounted inside the shell', async () => {
    const { content } = renderAppShell(container, { storage });
    await storage.init();
    renderHomeScreen(content);

    const muteButton = getByRole(container, 'button', { name: strings.muteButton.mute });
    muteButton.click();
    await flushPromises();

    expect(muteButton).toHaveAttribute('aria-label', strings.muteButton.unmute);
    expect(await storage.get('muted')).toBe(true);
  });
});
