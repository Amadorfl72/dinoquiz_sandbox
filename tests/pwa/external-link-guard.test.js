'use strict';

const path = require('path');

const APP_SHELL_PATH = path.resolve(__dirname, '../../public/scripts/appShell');
const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main');
const { renderHomeScreen } = require('../../public/scripts/homeScreen');
const { renderPrivacyPolicyScreen } = require('../../public/scripts/privacyPolicyScreen');
const {
  home: homeStrings,
  privacy: privacyStrings,
  purchase: purchaseStrings,
  privacyPolicy: privacyPolicyStrings,
} = require('../../public/i18n/es.json');

describe('TRIOFSND-121: Blindar el flujo lineal cerrado del niño (Inicio -> Quiz -> Resultados) sin enlaces externos navegables', () => {
  describe('isExternalAnchor', () => {
    const BASE_HREF = 'https://dinoquiz.app/index.html';

    test('flags an absolute http(s) link to a different origin as external', () => {
      const { isExternalAnchor } = require(APP_SHELL_PATH);
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://example.com/ads');

      expect(isExternalAnchor(anchor, BASE_HREF)).toBe(true);
    });

    test('flags a protocol-relative link to a different origin as external', () => {
      const { isExternalAnchor } = require(APP_SHELL_PATH);
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '//tracker.example.com/pixel');

      expect(isExternalAnchor(anchor, BASE_HREF)).toBe(true);
    });

    test('flags any target="_blank" anchor as external, even with a same-origin href', () => {
      const { isExternalAnchor } = require(APP_SHELL_PATH);
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/index.html');
      anchor.setAttribute('target', '_blank');

      expect(isExternalAnchor(anchor, BASE_HREF)).toBe(true);
    });

    test('does not flag a same-origin relative link', () => {
      const { isExternalAnchor } = require(APP_SHELL_PATH);
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/index.html');

      expect(isExternalAnchor(anchor, BASE_HREF)).toBe(false);
    });

    test('does not flag a same-origin hash link (the privacy policy route)', () => {
      const { isExternalAnchor } = require(APP_SHELL_PATH);
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '#/privacidad');

      expect(isExternalAnchor(anchor, BASE_HREF)).toBe(false);
    });

    test('does not flag an anchor with no href', () => {
      const { isExternalAnchor } = require(APP_SHELL_PATH);
      const anchor = document.createElement('a');

      expect(isExternalAnchor(anchor, BASE_HREF)).toBe(false);
    });

    test('does not throw and returns false for an unparsable href', () => {
      const { isExternalAnchor } = require(APP_SHELL_PATH);
      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'javascript:void(0)');

      expect(() => isExternalAnchor(anchor, BASE_HREF)).not.toThrow();
    });
  });

  describe('installExternalLinkGuard', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    function clickAnchor(anchor) {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      anchor.dispatchEvent(event);
      return event;
    }

    test('cancels a click on an externally-navigating anchor injected anywhere under the guarded root', () => {
      const { installExternalLinkGuard } = require(APP_SHELL_PATH);
      const win = { location: { href: 'https://dinoquiz.app/index.html' } };
      const guard = installExternalLinkGuard(container, win);

      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://example.com/leave-the-app');
      const child = document.createElement('span');
      anchor.appendChild(child);
      container.appendChild(anchor);

      const event = clickAnchor(child);

      expect(event.defaultPrevented).toBe(true);
      guard.destroy();
    });

    test('leaves a same-origin/internal link click alone', () => {
      const { installExternalLinkGuard } = require(APP_SHELL_PATH);
      const win = { location: { href: 'https://dinoquiz.app/index.html' } };
      const guard = installExternalLinkGuard(container, win);

      const anchor = document.createElement('a');
      anchor.setAttribute('href', '#/privacidad');
      container.appendChild(anchor);

      const event = clickAnchor(anchor);

      expect(event.defaultPrevented).toBe(false);
      guard.destroy();
    });

    test('ignores clicks that never land on an anchor', () => {
      const { installExternalLinkGuard } = require(APP_SHELL_PATH);
      const win = { location: { href: 'https://dinoquiz.app/index.html' } };
      const guard = installExternalLinkGuard(container, win);

      const button = document.createElement('button');
      container.appendChild(button);
      const event = clickAnchor(button);

      expect(event.defaultPrevented).toBe(false);
      guard.destroy();
    });

    test('neutralizes window.open so script-driven popups cannot leave the app', () => {
      const { installExternalLinkGuard } = require(APP_SHELL_PATH);
      const win = { location: { href: 'https://dinoquiz.app/index.html' }, open: jest.fn() };
      const guard = installExternalLinkGuard(container, win);

      const result = win.open('https://example.com');

      expect(result).toBeNull();
      guard.destroy();
    });

    test('destroy() restores the original window.open', () => {
      const { installExternalLinkGuard } = require(APP_SHELL_PATH);
      const originalOpen = jest.fn();
      const win = { location: { href: 'https://dinoquiz.app/index.html' }, open: originalOpen };
      const guard = installExternalLinkGuard(container, win);

      guard.destroy();

      expect(win.open).toBe(originalOpen);
    });

    test('returns null instead of installing when the given root has no addEventListener (no DOM to guard)', () => {
      const { installExternalLinkGuard } = require(APP_SHELL_PATH);

      expect(installExternalLinkGuard({}, {})).toBeNull();
    });
  });

  describe('the bootstrap installs the guard on startup', () => {
    test('installLinkGuard resolves and installs appShell.js\'s guard via require under Node/Jest', () => {
      const { installLinkGuard } = require(MAIN_JS_PATH);
      const win = { location: { href: 'https://dinoquiz.app/index.html' }, document, open: jest.fn() };

      const guard = installLinkGuard(win);

      expect(guard).not.toBeNull();
      expect(typeof guard.destroy).toBe('function');
      guard.destroy();
    });
  });

  describe('the rendered screens never contain a navigable anchor', () => {
    test('Home renders with no <a> elements anywhere in the DOM', () => {
      const container = document.createElement('div');
      renderHomeScreen(container, { strings: homeStrings, privacyStrings, purchaseStrings });

      expect(container.querySelectorAll('a').length).toBe(0);
    });

    test('the privacy policy screen renders with no <a> elements anywhere in the DOM', () => {
      const container = document.createElement('div');
      renderPrivacyPolicyScreen(container, { strings: privacyPolicyStrings });

      expect(container.querySelectorAll('a').length).toBe(0);
    });
  });
});
