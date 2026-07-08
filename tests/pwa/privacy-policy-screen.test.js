'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderPrivacyPolicyScreen } = require('../../public/scripts/privacyPolicyScreen');
const { privacyPolicy: strings, home: homeStrings } = require('../../public/i18n/es.json');

describe('PrivacyPolicyScreen (TRIOFSND-116)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the screen title and the "Volver" back button from the i18n resource', () => {
    renderPrivacyPolicyScreen(container);

    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
    expect(getByRole(container, 'button', { name: strings.backButtonLabel })).toBeInTheDocument();
  });

  test('moves focus to the title on mount so screen readers announce the new view', () => {
    const { title } = renderPrivacyPolicyScreen(container);

    expect(document.activeElement).toBe(title);
    expect(title).toHaveAttribute('tabindex', '-1');
  });

  test('the back button calls onBack when pressed (one tap back to Home)', () => {
    const onBack = jest.fn();
    const { backButton } = renderPrivacyPolicyScreen(container, { onBack });

    backButton.click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('the back button has a descriptive accessible name, not an icon-only control', () => {
    const { backButton } = renderPrivacyPolicyScreen(container);

    expect(backButton).toHaveAccessibleName(strings.backButtonLabel);
  });

  test('the back button meets the 48x48dp minimum touch target', () => {
    const cssPath = path.resolve(__dirname, '../../public/styles/main.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    const ruleMatch = css.match(/\.privacy-policy-screen__back-button\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();

    const minHeight = parseFloat(ruleMatch[1].match(/min-height:\s*([\d.]+)px/)[1]);
    const minWidth = parseFloat(ruleMatch[1].match(/min-width:\s*([\d.]+)px/)[1]);

    expect(minHeight).toBeGreaterThanOrEqual(48);
    expect(minWidth).toBeGreaterThanOrEqual(48);
  });

  test('renders a kid-friendly callout explaining that no personal data is collected', () => {
    renderPrivacyPolicyScreen(container);

    expect(getByText(container, strings.kidsCallout.heading)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.kidsCallout.body);
  });

  test('renders every content section (what data, purpose, rights, controller contact)', () => {
    renderPrivacyPolicyScreen(container);

    strings.sections.forEach((section) => {
      expect(getByText(container, section.heading)).toBeInTheDocument();
      section.paragraphs.forEach((paragraph) => {
        expect(container.textContent).toContain(paragraph);
      });
    });
  });

  test('every section heading is programmatically associated with its content for assistive tech', () => {
    renderPrivacyPolicyScreen(container);

    strings.sections.forEach((section) => {
      const heading = getByText(container, section.heading);
      const sectionEl = heading.closest('section');
      expect(sectionEl).toHaveAttribute('aria-labelledby', heading.id);
    });
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    renderPrivacyPolicyScreen(container, { locale: 'es' });

    expect(container.textContent).toContain(strings.screenTitle);
  });

  test('accepts pre-resolved strings so the browser can render without a bundler', () => {
    renderPrivacyPolicyScreen(container, { strings });

    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
  });

  test('the privacy policy screen and icon copy are part of the service worker app-shell precache', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    const swContent = fs.readFileSync(path.resolve(publicDir, 'service-worker.js'), 'utf-8');

    expect(swContent).toContain("'/scripts/privacyPolicyScreen.js'");
    expect(swContent).toContain("'/i18n/es.json'");
  });

  test('the icon label copy explains what the control does (used by the Home privacy icon)', () => {
    expect(typeof homeStrings.privacyPolicyIconLabel).toBe('string');
    expect(homeStrings.privacyPolicyIconLabel.length).toBeGreaterThan(0);
  });
});
