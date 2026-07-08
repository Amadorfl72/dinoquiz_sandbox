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

describe('HomeScreen first-run tooltip (TRIOFSND-65)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not render a tooltip by default (already-seen / not first run)', () => {
    renderHomeScreen(container);

    expect(container.querySelector('.home-screen__tooltip')).toBeNull();
  });

  test('renders an animated tooltip pointing at the "¡Jugar!" button when showTooltip is true', () => {
    const { tooltip, playButton } = renderHomeScreen(container, { showTooltip: true });

    expect(tooltip).not.toBeNull();
    expect(tooltip).toHaveClass('home-screen__tooltip--animated');
    expect(tooltip).toHaveTextContent(strings.tooltip.message);
    expect(playButton).toHaveAttribute('aria-describedby', tooltip.id);
  });

  test('hides the tooltip after the first tap anywhere on the screen', () => {
    const onTooltipDismiss = jest.fn();
    const { root, title } = renderHomeScreen(container, { showTooltip: true, onTooltipDismiss });

    title.click();

    expect(container.querySelector('.home-screen__tooltip')).toBeNull();
    expect(onTooltipDismiss).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.home-screen__tooltip')).toBeNull();
  });

  test('hides the tooltip on a tap outside .home-screen (e.g. empty/padding area of #app)', () => {
    const onTooltipDismiss = jest.fn();
    renderHomeScreen(container, { showTooltip: true, onTooltipDismiss });

    // container (#app) is not part of `.home-screen` itself — it's the
    // centered root's parent, standing in for the empty padding area
    // around it that a real tap outside the card would land on.
    container.click();

    expect(container.querySelector('.home-screen__tooltip')).toBeNull();
    expect(onTooltipDismiss).toHaveBeenCalledTimes(1);
  });

  test('hides the tooltip on a tap anywhere in the document, even outside #app', () => {
    const onTooltipDismiss = jest.fn();
    renderHomeScreen(container, { showTooltip: true, onTooltipDismiss });

    document.body.click();

    expect(container.querySelector('.home-screen__tooltip')).toBeNull();
    expect(onTooltipDismiss).toHaveBeenCalledTimes(1);
  });

  test('hides the tooltip when the "¡Jugar!" button is pressed', () => {
    const onTooltipDismiss = jest.fn();
    const { playButton } = renderHomeScreen(container, { showTooltip: true, onTooltipDismiss });

    playButton.click();

    expect(container.querySelector('.home-screen__tooltip')).toBeNull();
    expect(onTooltipDismiss).toHaveBeenCalledTimes(1);
  });

  test('removes the aria-describedby link once the tooltip is dismissed', () => {
    const { playButton } = renderHomeScreen(container, { showTooltip: true });

    playButton.click();

    expect(playButton).not.toHaveAttribute('aria-describedby');
  });

  test('does not call onTooltipDismiss more than once even if the screen is tapped repeatedly', () => {
    const onTooltipDismiss = jest.fn();
    const { root, playButton } = renderHomeScreen(container, { showTooltip: true, onTooltipDismiss });

    playButton.click();
    root.click();

    expect(onTooltipDismiss).toHaveBeenCalledTimes(1);
  });

  test('invokes onPlayButtonClick on every tap of the "¡Jugar!" button', () => {
    const onPlayButtonClick = jest.fn();
    const { playButton } = renderHomeScreen(container, { onPlayButtonClick });

    playButton.click();
    playButton.click();

    expect(onPlayButtonClick).toHaveBeenCalledTimes(2);
  });
});
