'use strict';

require('@testing-library/jest-dom');

const { renderHallOfFameScreen } = require('./hallOfFameScreen');
const { hallOfFame: strings } = require('../i18n/es.json');

function click(element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function rowTexts(container) {
  return Array.from(container.querySelectorAll('.hall-of-fame-screen__row')).map((row) =>
    Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent)
  );
}

describe('hallOfFameScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders one row per entry, in the same order the service returned them', () => {
    const entries = [
      { name: 'Ana', score: 10, timestamp: 1 },
      { name: 'Leo', score: 8, timestamp: 2 },
      { name: 'Mia', score: 6, timestamp: 3 },
    ];

    renderHallOfFameScreen(container, { strings, entries });

    const rows = rowTexts(container);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['1', 'Ana', '10']);
    expect(rows[1]).toEqual(['2', 'Leo', '8']);
    expect(rows[2]).toEqual(['3', 'Mia', '6']);
  });

  it('highlights only the row matching highlightEntryId, with a visible badge (not color alone)', () => {
    const entries = [
      { name: 'Ana', score: 10, timestamp: 111 },
      { name: 'Leo', score: 8, timestamp: 222 },
    ];

    renderHallOfFameScreen(container, { strings, entries, highlightEntryId: 222 });

    const rows = container.querySelectorAll('.hall-of-fame-screen__row');
    expect(rows[0]).not.toHaveClass('hall-of-fame-screen__row--highlight');
    expect(rows[1]).toHaveClass('hall-of-fame-screen__row--highlight');

    const badge = rows[1].querySelector('.hall-of-fame-screen__badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe(strings.highlightBadge);
    expect(rows[0].querySelector('.hall-of-fame-screen__badge')).toBeNull();
  });

  it('renders the documented guest label for a name: null entry, never a blank cell', () => {
    const entries = [{ name: null, score: 5, timestamp: 1 }];

    renderHallOfFameScreen(container, { strings, entries });

    const rows = rowTexts(container);
    expect(rows[0][1]).toBe(strings.guestLabel);
    expect(rows[0][1].trim()).not.toBe('');
  });

  it('renders the empty-state message and no table when there are zero entries', () => {
    renderHallOfFameScreen(container, { strings, entries: [] });

    expect(container.querySelector('.hall-of-fame-screen__table')).toBeNull();
    expect(container.querySelector('.hall-of-fame-screen__delete-button')).toBeNull();
    const empty = container.querySelector('.hall-of-fame-screen__empty');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toBe(strings.emptyMessage);
  });

  it('the delete button, once confirmed, clears every entry via hallOfFameService.clearAll()', () => {
    let stored = [
      { name: 'Ana', score: 10, timestamp: 1 },
      { name: 'Leo', score: 8, timestamp: 2 },
    ];
    const hallOfFameService = {
      getEntries: jest.fn(() => stored),
      clearAll: jest.fn(() => {
        stored = [];
        return true;
      }),
    };

    renderHallOfFameScreen(container, { strings, hallOfFameService });

    expect(rowTexts(container)).toHaveLength(2);

    const deleteButton = container.querySelector('.hall-of-fame-screen__delete-button');
    const deleteConfirm = container.querySelector('.hall-of-fame-screen__delete-confirm');
    expect(deleteConfirm).not.toBeVisible();

    click(deleteButton);
    expect(deleteButton).not.toBeVisible();
    expect(deleteConfirm).toBeVisible();

    const deleteConfirmButton = container.querySelector('.hall-of-fame-screen__delete-confirm-button');
    click(deleteConfirmButton);

    expect(hallOfFameService.clearAll).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.hall-of-fame-screen__table')).toBeNull();
    expect(container.querySelector('.hall-of-fame-screen__empty').textContent).toBe(strings.emptyMessage);
  });

  it('cancelling the delete confirmation leaves every entry untouched', () => {
    const hallOfFameService = {
      getEntries: jest.fn(() => [{ name: 'Ana', score: 10, timestamp: 1 }]),
      clearAll: jest.fn(),
    };

    renderHallOfFameScreen(container, { strings, hallOfFameService });

    click(container.querySelector('.hall-of-fame-screen__delete-button'));
    click(container.querySelector('.hall-of-fame-screen__delete-cancel-button'));

    expect(hallOfFameService.clearAll).not.toHaveBeenCalled();
    expect(rowTexts(container)).toHaveLength(1);
    expect(container.querySelector('.hall-of-fame-screen__delete-button')).toBeVisible();
  });

  describe('back navigation (options.onBack)', () => {
    it('renders a back button labelled from strings.backButtonLabel that calls onBack when clicked', () => {
      const onBack = jest.fn();
      const { backButton } = renderHallOfFameScreen(container, { strings, entries: [], onBack });

      expect(backButton).not.toBeNull();
      expect(backButton).toHaveTextContent(strings.backButtonLabel);
      expect(backButton).toHaveAccessibleName(strings.backButtonLabel);

      click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders the back button even without onBack, but it does nothing when clicked', () => {
      const { backButton } = renderHallOfFameScreen(container, { strings, entries: [] });

      expect(backButton).not.toBeNull();
      expect(() => click(backButton)).not.toThrow();
    });

    it('the back button is a real, keyboard- and touch-operable <button>', () => {
      const { backButton } = renderHallOfFameScreen(container, { strings, entries: [], onBack: jest.fn() });

      expect(backButton.tagName).toBe('BUTTON');
      expect(backButton).toHaveAttribute('type', 'button');
    });
  });
});
