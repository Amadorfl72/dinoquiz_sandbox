'use strict';

require('@testing-library/jest-dom');

const { renderPrivacyPolicyScreen } = require('./privacyPolicyScreen');
const { privacyPolicy: strings } = require('../i18n/es.json');

function renderWithFixture(container, overrides) {
  return renderPrivacyPolicyScreen(
    container,
    Object.assign(
      {
        strings: strings,
      },
      overrides
    )
  );
}

describe('privacyPolicyScreen — data deletion action', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the delete button from strings.dataDeletion and starts with the confirm step hidden', () => {
    const screen = renderWithFixture(container);

    expect(screen.deleteButton.textContent).toBe(strings.dataDeletion.buttonLabel);
    expect(screen.deleteConfirm.hidden).toBe(true);
  });

  test('clicking the delete button reveals the confirm step without deleting anything yet', () => {
    const hallOfFameService = { clearAll: jest.fn() };
    const screen = renderWithFixture(container, { hallOfFameService: hallOfFameService });

    screen.deleteButton.click();

    expect(screen.deleteConfirm.hidden).toBe(false);
    expect(hallOfFameService.clearAll).not.toHaveBeenCalled();
  });

  test('cancelling the confirm step hides it again without calling hallOfFameService.clearAll', () => {
    const hallOfFameService = { clearAll: jest.fn() };
    const screen = renderWithFixture(container, { hallOfFameService: hallOfFameService });

    screen.deleteButton.click();
    screen.deleteCancelButton.click();

    expect(screen.deleteConfirm.hidden).toBe(true);
    expect(hallOfFameService.clearAll).not.toHaveBeenCalled();
  });

  test('confirming the delete-all-data action calls hallOfFameService.clearAll()', () => {
    const hallOfFameService = { clearAll: jest.fn() };
    const screen = renderWithFixture(container, { hallOfFameService: hallOfFameService });

    screen.deleteButton.click();
    screen.deleteConfirmButton.click();

    expect(hallOfFameService.clearAll).toHaveBeenCalledTimes(1);
  });

  test('confirming the delete-all-data action also clears best score, max streak and discovered fun facts', () => {
    const hallOfFameService = { clearAll: jest.fn() };
    const storage = {
      removeItem: jest.fn(),
    };
    const screen = renderWithFixture(container, { hallOfFameService: hallOfFameService, storage: storage });

    screen.deleteButton.click();
    screen.deleteConfirmButton.click();

    expect(storage.removeItem).toHaveBeenCalledWith('dinoquiz:bestScore');
    expect(storage.removeItem).toHaveBeenCalledWith('dinoquiz:maxStreak');
    expect(storage.removeItem).toHaveBeenCalledWith('dinoquiz:discoveredFunFacts');
    expect(hallOfFameService.clearAll).toHaveBeenCalledWith(storage);
  });

  test('confirming shows the success message and hides the confirm step again', () => {
    const hallOfFameService = { clearAll: jest.fn() };
    const screen = renderWithFixture(container, { hallOfFameService: hallOfFameService });

    screen.deleteButton.click();
    screen.deleteConfirmButton.click();

    expect(screen.deleteStatus.textContent).toBe(strings.dataDeletion.successMessage);
    expect(screen.deleteConfirm.hidden).toBe(true);
  });

  test('the privacy policy "derechos" section mentions the Hall of Fame is included in the on-device data wipe', () => {
    const derechos = strings.sections.find((section) => section.id === 'derechos');

    expect(derechos.paragraphs.join(' ')).toMatch(/Salón de la Fama/);
  });
});
