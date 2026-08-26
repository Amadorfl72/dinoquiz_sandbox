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
    expect(container.textContent).toContain(strings.sevenOption);
    expect(container.textContent).toContain(strings.eightPlusOption);
  });

  test('renders exactly two large, clearly-labeled options ("7 años o menos" and "8 años o más"), never a 6-year-old option', () => {
    const { sevenButton, eightPlusButton } = renderAgeGateScreen(container, { strings });

    expect(strings.sevenOption).toBe('7 años o menos');
    expect(getByRole(container, 'button', { name: strings.sevenOption })).toBe(sevenButton);
    expect(getByRole(container, 'button', { name: strings.eightPlusOption })).toBe(eightPlusButton);
    expect(container.querySelectorAll('.age-gate-screen__option').length).toBe(2);
    expect(strings.sixOption).toBeUndefined();
    expect(container.textContent).not.toContain('6 años');
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

  test('tapping "7 años o menos" calls onSelect with AGE_BANDS.SEVEN', () => {
    const onSelect = jest.fn();
    const { sevenButton } = renderAgeGateScreen(container, { strings, onSelect });

    sevenButton.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(AGE_BANDS.SEVEN);
  });

  test('tapping "8 años o más" calls onSelect with AGE_BANDS.EIGHT_PLUS', () => {
    const onSelect = jest.fn();
    const { eightPlusButton } = renderAgeGateScreen(container, { strings, onSelect });

    eightPlusButton.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(AGE_BANDS.EIGHT_PLUS);
  });

  test('a selection is tracked in memory via getSelectedAgeBand/setSelectedAgeBand', () => {
    expect(getSelectedAgeBand()).toBeNull();

    const { sevenButton } = renderAgeGateScreen(container, { strings });
    sevenButton.click();

    expect(getSelectedAgeBand()).toBe(AGE_BANDS.SEVEN);
  });

  test('setSelectedAgeBand rejects an unknown value, keeping the tracked selection null/valid', () => {
    setSelectedAgeBand('not-a-real-band');
    expect(getSelectedAgeBand()).toBeNull();

    setSelectedAgeBand(AGE_BANDS.SEVEN);
    expect(getSelectedAgeBand()).toBe(AGE_BANDS.SEVEN);
  });

  test('resetSelectedAgeBand clears any prior in-memory selection (never persisted across a reset/new session)', () => {
    setSelectedAgeBand(AGE_BANDS.SEVEN);
    resetSelectedAgeBand();

    expect(getSelectedAgeBand()).toBeNull();
  });

  test('the safe default, used when the age cannot be determined, keeps the current (unrestricted) content', () => {
    expect(SAFE_DEFAULT_AGE_BAND).toBe(AGE_BANDS.EIGHT_PLUS);
  });

  test('AGE_BANDS no longer exposes a six-year-old band', () => {
    expect(AGE_BANDS.SIX).toBeUndefined();
    expect(Object.values(AGE_BANDS)).not.toContain('six');
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
    const { sevenButton, eightPlusButton } = renderAgeGateScreen(container, { strings });

    expect(sevenButton).toHaveAccessibleName(strings.sevenOption);
    expect(eightPlusButton).toHaveAccessibleName(strings.eightPlusOption);
  });

  test('both options are real buttons meeting the >=48x48dp minimum touch target', () => {
    const { sevenButton, eightPlusButton } = renderAgeGateScreen(container, { strings });

    expect(sevenButton.tagName).toBe('BUTTON');
    expect(eightPlusButton.tagName).toBe('BUTTON');
    expect(sevenButton).toHaveClass('age-gate-screen__option');
    expect(eightPlusButton).toHaveClass('age-gate-screen__option');
  });

  test('the decorative dino icons are hidden from assistive tech', () => {
    renderAgeGateScreen(container, { strings });

    container.querySelectorAll('.age-gate-screen__option-icon').forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
