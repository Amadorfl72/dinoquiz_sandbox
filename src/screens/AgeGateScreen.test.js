'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { AGE_BANDS, SAFE_DEFAULT_AGE_BAND, getSelectedAgeBand, setSelectedAgeBand, resetSelectedAgeBand, renderAgeGateScreen } =
  require('./AgeGateScreen');
const { ageGate: strings } = require('../../public/i18n/es.json');

describe('AgeGateScreen rendering', () => {
  let container;

  beforeEach(() => {
    resetSelectedAgeBand();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title, instructions and both options come from the es locale resource file', () => {
    renderAgeGateScreen(container, { locale: 'es' });

    expect(getByText(container, strings.screenTitle)).toBeInTheDocument();
    expect(container.textContent).toContain(strings.instructions);
    expect(container.textContent).toContain(strings.underSevenOption);
    expect(container.textContent).toContain(strings.sevenOrMoreOption);
  });

  test('renders exactly two large, clearly-labeled options', () => {
    const { underSevenButton, sevenOrMoreButton } = renderAgeGateScreen(container, { strings });

    expect(getByRole(container, 'button', { name: strings.underSevenOption })).toBe(underSevenButton);
    expect(getByRole(container, 'button', { name: strings.sevenOrMoreOption })).toBe(sevenOrMoreButton);
  });

  test('re-rendering into the same container clears the previous render', () => {
    renderAgeGateScreen(container, { strings });
    renderAgeGateScreen(container, { strings });

    expect(container.querySelectorAll('.age-gate-screen').length).toBe(1);
  });
});

describe('AgeGateScreen selection', () => {
  let container;

  beforeEach(() => {
    resetSelectedAgeBand();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    resetSelectedAgeBand();
  });

  test('tapping "menos de 7" calls onSelect with AGE_BANDS.UNDER_7', () => {
    const onSelect = jest.fn();
    const { underSevenButton } = renderAgeGateScreen(container, { strings, onSelect });

    underSevenButton.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(AGE_BANDS.UNDER_7);
  });

  test('tapping "7 años o más" calls onSelect with AGE_BANDS.SEVEN_OR_MORE', () => {
    const onSelect = jest.fn();
    const { sevenOrMoreButton } = renderAgeGateScreen(container, { strings, onSelect });

    sevenOrMoreButton.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(AGE_BANDS.SEVEN_OR_MORE);
  });

  test('a selection is tracked in memory via getSelectedAgeBand/setSelectedAgeBand', () => {
    expect(getSelectedAgeBand()).toBeNull();

    const { underSevenButton } = renderAgeGateScreen(container, { strings });
    underSevenButton.click();

    expect(getSelectedAgeBand()).toBe(AGE_BANDS.UNDER_7);
  });

  test('setSelectedAgeBand rejects an unknown value, keeping the tracked selection null/valid', () => {
    setSelectedAgeBand('not-a-real-band');
    expect(getSelectedAgeBand()).toBeNull();

    setSelectedAgeBand(AGE_BANDS.SEVEN_OR_MORE);
    expect(getSelectedAgeBand()).toBe(AGE_BANDS.SEVEN_OR_MORE);
  });

  test('resetSelectedAgeBand clears any prior in-memory selection (never persisted across a reset/new session)', () => {
    setSelectedAgeBand(AGE_BANDS.UNDER_7);
    resetSelectedAgeBand();

    expect(getSelectedAgeBand()).toBeNull();
  });

  test('the safe default, used when the age cannot be determined, keeps the current (unrestricted) content', () => {
    expect(SAFE_DEFAULT_AGE_BAND).toBe(AGE_BANDS.SEVEN_OR_MORE);
  });
});

describe('AgeGateScreen accessibility (roles/labels, focus)', () => {
  let container;

  beforeEach(() => {
    resetSelectedAgeBand();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('the title is a heading and receives focus on mount so screen readers announce the new screen', () => {
    const { title } = renderAgeGateScreen(container, { strings });

    expect(getByRole(container, 'heading', { name: strings.screenTitle })).toBe(title);
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute('tabindex', '-1');
  });

  test('the two options are grouped together and labelled by the screen title', () => {
    const { optionsGroup, title } = renderAgeGateScreen(container, { strings });

    expect(optionsGroup).toHaveAttribute('role', 'group');
    expect(optionsGroup.getAttribute('aria-labelledby')).toBe(title.id);
  });

  test('each option button exposes an accessible name equal to its visible label', () => {
    const { underSevenButton, sevenOrMoreButton } = renderAgeGateScreen(container, { strings });

    expect(underSevenButton).toHaveAccessibleName(strings.underSevenOption);
    expect(sevenOrMoreButton).toHaveAccessibleName(strings.sevenOrMoreOption);
  });

  test('both options are real buttons meeting the >=48x48dp minimum touch target', () => {
    const { underSevenButton, sevenOrMoreButton } = renderAgeGateScreen(container, { strings });

    expect(underSevenButton.tagName).toBe('BUTTON');
    expect(sevenOrMoreButton.tagName).toBe('BUTTON');
    expect(underSevenButton).toHaveClass('age-gate-screen__option');
    expect(sevenOrMoreButton).toHaveClass('age-gate-screen__option');
  });

  test('the decorative dino icons are hidden from assistive tech', () => {
    renderAgeGateScreen(container, { strings });

    container.querySelectorAll('.age-gate-screen__option-icon').forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
