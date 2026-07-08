'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText, getAllByRole } = require('@testing-library/dom');

const { renderPrivacyScreen } = require('./PrivacyScreen');
const { privacy: strings } = require('../i18n/es.json');

describe('PrivacyScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the title and intro from the i18n resource', () => {
    renderPrivacyScreen(container);

    expect(getByRole(container, 'heading', { level: 1, name: strings.title })).toBeInTheDocument();
    expect(getByText(container, strings.intro)).toBeInTheDocument();
  });

  test('renders every policy section with its heading and body (what data, purpose, rights, contact)', () => {
    renderPrivacyScreen(container);

    strings.sections.forEach((section) => {
      expect(getByRole(container, 'heading', { level: 2, name: section.heading })).toBeInTheDocument();
      expect(getByText(container, section.body)).toBeInTheDocument();
    });
  });

  test('renders exactly one section per policy point sourced from the i18n resource', () => {
    const { sectionEls } = renderPrivacyScreen(container);

    expect(sectionEls).toHaveLength(strings.sections.length);
    sectionEls.forEach((sectionEl) => expect(sectionEl.tagName).toBe('SECTION'));
  });

  test('renders an accessible back-to-home button', () => {
    const { backButton } = renderPrivacyScreen(container);

    expect(getByRole(container, 'button', { name: strings.backButtonAriaLabel })).toBe(backButton);
    expect(backButton).toHaveTextContent(strings.backButton);
  });

  test('calls onBack when the back button is tapped, for navigation back to the home screen', () => {
    const onBack = jest.fn();
    const { backButton } = renderPrivacyScreen(container, { onBack });

    backButton.click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('does nothing if no onBack handler is provided', () => {
    const { backButton } = renderPrivacyScreen(container);

    expect(() => backButton.click()).not.toThrow();
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    renderPrivacyScreen(container, { locale: 'es' });

    strings.sections.forEach((section) => {
      expect(container.textContent).toContain(section.body);
    });
  });

  test('mentions no personal data is collected, the purpose, rights and a contact for the data controller', () => {
    renderPrivacyScreen(container);

    const allText = container.textContent.toLowerCase();
    expect(allText).toMatch(/dato/);
    expect(allText).toMatch(/dispositivo/);
    expect(allText).toMatch(/derecho/);
    expect(allText).toMatch(/@/);
  });

  test('the back button is the first focusable control, so it is reachable immediately', () => {
    renderPrivacyScreen(container);

    const buttons = getAllByRole(container, 'button');
    expect(buttons[0]).toHaveClass('privacy-screen__back-button');
  });
});
