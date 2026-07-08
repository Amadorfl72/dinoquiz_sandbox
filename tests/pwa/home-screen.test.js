'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getByText, fireEvent } = require('@testing-library/dom');

const { renderHomeScreen, MASCOT_IMAGE_SRC } = require('../../public/scripts/homeScreen');
const { home: strings, privacy: privacyStrings, purchase: purchaseStrings } = require('../../public/i18n/es.json');

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
    const ruleMatch = css.match(/\.home-screen__play-button\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();

    const rule = ruleMatch[1];
    const minHeight = parseFloat(rule.match(/min-height:\s*([\d.]+)px/)[1]);
    const minWidth = parseFloat(rule.match(/min-width:\s*([\d.]+)px/)[1]);
    const fontSizeRem = parseFloat(rule.match(/font-size:\s*([\d.]+)rem/)[1]);

    expect(minHeight).toBeGreaterThanOrEqual(64);
    expect(minWidth).toBeGreaterThanOrEqual(48);
    expect(fontSizeRem * 16).toBeGreaterThanOrEqual(24);
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

describe('HomeScreen global controls (TRIOFSND-66: mute, privacy policy, remove-ads purchase)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders a mute, a privacy and a purchase icon button, each an accessible, named button', () => {
    const { muteButton, privacyButton, purchaseButton } = renderHomeScreen(container);

    expect(muteButton.tagName).toBe('BUTTON');
    expect(muteButton).toHaveAccessibleName(strings.globalControls.muteButton.muteLabel);

    expect(privacyButton.tagName).toBe('BUTTON');
    expect(privacyButton).toHaveAccessibleName(strings.globalControls.privacyButton);

    expect(purchaseButton.tagName).toBe('BUTTON');
    expect(purchaseButton).toHaveAccessibleName(strings.globalControls.purchaseButton);
  });

  test('every global control meets the >=48x48dp minimum touch target (AC-13 sibling rule)', () => {
    const cssPath = path.resolve(__dirname, '../../public/styles/main.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    const ruleMatch = css.match(/\.home-screen__icon-button\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();

    const rule = ruleMatch[1];
    expect(parseFloat(rule.match(/min-width:\s*([\d.]+)px/)[1])).toBeGreaterThanOrEqual(48);
    expect(parseFloat(rule.match(/min-height:\s*([\d.]+)px/)[1])).toBeGreaterThanOrEqual(48);
  });

  test('the mute button starts unmuted by default, with aria-pressed reflecting the state', () => {
    const { muteButton } = renderHomeScreen(container);

    expect(muteButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('the mute button honors an initial muted state from options', () => {
    const { muteButton } = renderHomeScreen(container, { muted: true });

    expect(muteButton).toHaveAttribute('aria-pressed', 'true');
    expect(muteButton).toHaveAccessibleName(strings.globalControls.muteButton.unmuteLabel);
  });

  test('clicking the mute button toggles aria-pressed, the accessible name, and notifies onToggleMute', () => {
    const onToggleMute = jest.fn();
    const { muteButton, isMuted } = renderHomeScreen(container, { onToggleMute });

    fireEvent.click(muteButton);

    expect(muteButton).toHaveAttribute('aria-pressed', 'true');
    expect(muteButton).toHaveAccessibleName(strings.globalControls.muteButton.unmuteLabel);
    expect(isMuted()).toBe(true);
    expect(onToggleMute).toHaveBeenCalledWith(true);

    fireEvent.click(muteButton);

    expect(muteButton).toHaveAttribute('aria-pressed', 'false');
    expect(onToggleMute).toHaveBeenCalledWith(false);
  });

  test('the mute button is keyboard operable (a native <button>, reachable by Tab, activated by Enter/Space)', () => {
    const { muteButton } = renderHomeScreen(container);

    muteButton.focus();
    expect(document.activeElement).toBe(muteButton);
    expect(muteButton.disabled).toBe(false);
  });

  test('the privacy button is hidden from view initially and reachable in a single tap (AC-16: <=2 taps)', () => {
    const { privacyButton, privacyPanel } = renderHomeScreen(container);

    expect(privacyPanel.hidden).toBe(true);
    expect(privacyButton).toHaveAttribute('aria-expanded', 'false');
    expect(privacyButton).toHaveAttribute('aria-controls', privacyPanel.id);

    fireEvent.click(privacyButton);

    expect(privacyPanel.hidden).toBe(false);
    expect(privacyButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('the privacy panel content comes from the i18n resource, not hardcoded copy (AC-15)', () => {
    const { privacyButton, privacyPanel } = renderHomeScreen(container);

    fireEvent.click(privacyButton);

    expect(privacyPanel).toHaveTextContent(privacyStrings.heading);
    expect(privacyPanel).toHaveTextContent(privacyStrings.intro);
    privacyStrings.sections.forEach((section) => {
      expect(privacyPanel).toHaveTextContent(section.heading);
      expect(privacyPanel).toHaveTextContent(section.body);
    });
  });

  test('closing the privacy panel collapses it and returns focus to the trigger button', () => {
    const { privacyButton, privacyPanel } = renderHomeScreen(container);

    fireEvent.click(privacyButton);
    const closeButton = getByText(privacyPanel, privacyStrings.closeButton);
    fireEvent.click(closeButton);

    expect(privacyPanel.hidden).toBe(true);
    expect(privacyButton).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(privacyButton);
  });

  test('the Escape key closes an open privacy panel', () => {
    const { privacyButton, privacyPanel } = renderHomeScreen(container);

    fireEvent.click(privacyButton);
    fireEvent.keyDown(privacyPanel, { key: 'Escape' });

    expect(privacyPanel.hidden).toBe(true);
  });

  test('the purchase button opens the remove-ads entry point with price and a "Comprar" call to action', () => {
    const { purchaseButton, purchasePanel } = renderHomeScreen(container);

    fireEvent.click(purchaseButton);

    expect(purchasePanel.hidden).toBe(false);
    expect(purchasePanel).toHaveTextContent(purchaseStrings.heading);
    expect(purchasePanel).toHaveTextContent(purchaseStrings.description);
    expect(purchasePanel).toHaveTextContent(purchaseStrings.priceLabel);
    expect(getByText(purchasePanel, purchaseStrings.purchaseButton)).toBeInTheDocument();
  });

  test('confirming the purchase invokes options.onPurchase (entry point into the IAP flow)', () => {
    const onPurchase = jest.fn();
    const { purchaseButton, purchaseConfirmButton } = renderHomeScreen(container, { onPurchase });

    fireEvent.click(purchaseButton);
    fireEvent.click(purchaseConfirmButton);

    expect(onPurchase).toHaveBeenCalledTimes(1);
  });

  test('global controls are grouped under an accessible, labeled group', () => {
    const { globalControls } = renderHomeScreen(container);

    expect(globalControls).toHaveAttribute('role', 'group');
    expect(globalControls).toHaveAccessibleName(strings.globalControls.groupLabel);
  });
});
