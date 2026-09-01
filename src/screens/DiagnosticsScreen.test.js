'use strict';

require('@testing-library/jest-dom');
const { getByRole, getAllByRole, queryByRole } = require('@testing-library/dom');

const { renderDiagnosticsScreen, groupCountersByMode } = require('./DiagnosticsScreen');
const { MODE_IDS, MODES_CATALOG } = require('../game/modesCatalog');
const { diagnostics: strings, modes: modesStrings } = require('../../public/i18n/es.json');

// Flushes every already-queued microtask (the export handler chains several
// `.then`s over an injected promise) using a macrotask, which always runs
// after all pending microtasks regardless of how many `.then` hops there are.
function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function renderWithFixture(container, overrides) {
  return renderDiagnosticsScreen(
    container,
    Object.assign(
      {
        strings,
        modesStrings,
        modes: MODES_CATALOG,
        counters: {},
        errors: [],
        serviceWorkerStatus: 'active',
        swVersion: 'v35',
        lastPreloadAt: '2026-08-20T10:00:00.000Z',
        resourceAvailability: MODES_CATALOG.map((mode) => ({
          modeId: mode.id,
          available: true,
          cause: null,
          details: null,
        })),
      },
      overrides
    )
  );
}

describe('groupCountersByMode', () => {
  test('groups mode-scoped counters under their mode id and keeps mode-less counters under general', () => {
    const counters = {
      selectorOpen: 3,
      'gameStarted:parejas': 2,
      'gamesByModeLevel:parejas:2': 1,
      'correctAnswers:quiz': 5,
    };

    const grouped = groupCountersByMode(counters, [MODE_IDS.QUIZ, MODE_IDS.PAREJAS]);

    expect(grouped.byMode[MODE_IDS.PAREJAS]).toEqual([
      { key: 'gameStarted:parejas', label: 'gameStarted', value: 2 },
      { key: 'gamesByModeLevel:parejas:2', label: 'gamesByModeLevel:2', value: 1 },
    ]);
    expect(grouped.byMode[MODE_IDS.QUIZ]).toEqual([{ key: 'correctAnswers:quiz', label: 'correctAnswers', value: 5 }]);
    expect(grouped.general).toEqual([{ key: 'selectorOpen', label: 'selectorOpen', value: 3 }]);
  });

  test('a counter whose second segment is not a known mode id falls back to general', () => {
    const grouped = groupCountersByMode({ 'foo:notAMode': 1 }, [MODE_IDS.QUIZ]);
    expect(grouped.general).toEqual([{ key: 'foo:notAMode', label: 'foo:notAMode', value: 1 }]);
    expect(grouped.byMode[MODE_IDS.QUIZ]).toEqual([]);
  });
});

describe('DiagnosticsScreen rendering', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('does not hardcode copy — title and back button come from the es locale resource file', () => {
    renderWithFixture(container);

    expect(getByRole(container, 'heading', { name: strings.screenTitle, level: 1 })).toBeInTheDocument();
    expect(getByRole(container, 'button', { name: strings.backButtonLabel })).toBeInTheDocument();
  });

  test('the title is a heading and receives focus on mount so screen readers announce the new screen', () => {
    const { title } = renderWithFixture(container);

    expect(title).toHaveFocus();
    expect(title).toHaveAttribute('tabindex', '-1');
  });

  test('back button is a real, focusable button (keyboard reachable/activatable) with an accessible name, and calls onBack', () => {
    const onBack = jest.fn();
    const { backButton } = renderWithFixture(container, { onBack });

    expect(backButton.tagName).toBe('BUTTON');
    expect(backButton).toHaveAccessibleName(strings.backButtonLabel);
    expect(backButton).not.toHaveAttribute('disabled');

    // <button> fires a click for both a pointer tap and a keyboard Enter/Space
    // activation natively -- asserting the handler is wired to click (not a
    // pointer-only event) is what "activable por teclado" means here.
    backButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('never renders individual player names or answers -- only aggregated counters/errors', () => {
    // The diagnostics data model itself has no name/answer field (see
    // diagnostics.js's recordError doc comment); this asserts the screen
    // doesn't invent one out of extra fields a future caller might pass.
    renderWithFixture(container, {
      counters: { 'gameStarted:parejas': 4 },
      errors: [
        {
          date: '2026-08-20',
          mode: 'parejas',
          category: 'render',
          code: 'BOARD_RENDER_FAILED',
          playerNickname: 'Rex',
          selectedAnswer: 'Tiranosaurio',
        },
      ],
    });

    expect(container.textContent).not.toContain('Rex');
    expect(container.textContent).not.toContain('Tiranosaurio');
  });

  describe('health section', () => {
    test('shows the service worker status, cache version and last preload mark from the resolved values', () => {
      renderWithFixture(container, {
        serviceWorkerStatus: 'active',
        swVersion: 'v35',
        lastPreloadAt: '2026-08-20T10:00:00.000Z',
      });

      expect(getByRole(container, 'heading', { name: strings.health.heading })).toBeInTheDocument();
      expect(container.textContent).toContain(strings.health.serviceWorkerStatus.active);
      expect(container.textContent).toContain('v35');
    });

    test('falls back to the unknown-value copy when the cache version/last preload were never recorded', () => {
      renderWithFixture(container, { swVersion: null, lastPreloadAt: null });

      const unknownOccurrences = container.textContent.split(strings.health.unknownValue).length - 1;
      expect(unknownOccurrences).toBeGreaterThanOrEqual(2);
    });

    test('reports "unsupported" when there is no Service Worker API', () => {
      renderWithFixture(container, { serviceWorkerStatus: 'unsupported' });
      expect(container.textContent).toContain(strings.health.serviceWorkerStatus.unsupported);
    });
  });

  describe('resource availability section', () => {
    test('lists every mode with a text status, never color alone, and the blocked reason for a blocked mode', () => {
      renderWithFixture(container, {
        resourceAvailability: [
          { modeId: MODE_IDS.QUIZ, available: true, cause: null, details: null },
          { modeId: MODE_IDS.SOMBRA, available: false, cause: 'insufficient_creatures', details: null },
        ],
      });

      expect(container.textContent).toContain(modesStrings.quiz.name);
      expect(container.textContent).toContain(strings.resourceAvailability.statusAvailable);
      expect(container.textContent).toContain(modesStrings.sombra.name);
      expect(container.textContent).toContain(strings.resourceAvailability.statusBlocked);
      expect(container.textContent).toContain(strings.resourceAvailability.blockedReasons.insufficient_creatures);
    });
  });

  describe('counters section', () => {
    test('shows the empty message when there are no counters at all', () => {
      renderWithFixture(container, { counters: {} });
      expect(container.textContent).toContain(strings.counters.emptyMessage);
    });

    test('groups per-mode counters under the mode display name and mode-less counters under "general"', () => {
      renderWithFixture(container, {
        counters: { 'gameStarted:parejas': 2, selectorOpen: 5 },
      });

      expect(getByRole(container, 'heading', { name: modesStrings.parejas.name, level: 3 })).toBeInTheDocument();
      expect(getByRole(container, 'heading', { name: strings.counters.generalHeading, level: 3 })).toBeInTheDocument();
      expect(container.textContent).toContain('gameStarted');
      expect(container.textContent).toContain('2');
      expect(container.textContent).toContain('selectorOpen');
      expect(container.textContent).toContain('5');
    });

    test('never shows a mode heading for a mode with zero counters', () => {
      renderWithFixture(container, { counters: { 'gameStarted:parejas': 1 } });
      expect(queryByRole(container, 'heading', { name: modesStrings.quiz.name, level: 3 })).not.toBeInTheDocument();
    });
  });

  describe('errors section', () => {
    test('shows the empty message when no errors were recorded', () => {
      renderWithFixture(container, { errors: [] });
      expect(container.textContent).toContain(strings.errors.emptyMessage);
    });

    test('lists local date, mode, category and code for every recorded error, most recent first', () => {
      renderWithFixture(container, {
        errors: [
          { date: '2026-08-18', mode: 'parejas', category: 'render', code: 'BOARD_RENDER_FAILED' },
          { date: '2026-08-20', mode: 'timeline', category: 'data', code: 'MISSING_CREATURE' },
        ],
      });

      const rows = getAllByRole(container, 'row');
      // rows[0] is the header row; rows[1] must be the most recent error.
      expect(rows[1].textContent).toContain('2026-08-20');
      expect(rows[1].textContent).toContain('timeline');
      expect(rows[1].textContent).toContain('data');
      expect(rows[1].textContent).toContain('MISSING_CREATURE');
      expect(rows[2].textContent).toContain('2026-08-18');
    });

    test('column headers come from i18n, not hardcoded strings', () => {
      renderWithFixture(container, {
        errors: [{ date: '2026-08-20', mode: 'parejas', category: 'render', code: 'X' }],
      });

      [strings.errors.columns.date, strings.errors.columns.mode, strings.errors.columns.category, strings.errors.columns.code].forEach(
        (columnLabel) => {
          expect(getByRole(container, 'columnheader', { name: columnLabel })).toBeInTheDocument();
        }
      );
    });
  });

  describe('delete with confirmation (TRIOFSND-320)', () => {
    function makeFakeDiagnosticsService(overrides) {
      return Object.assign(
        {
          getCounters: jest.fn(() => ({})),
          getErrors: jest.fn(() => []),
          resetDiagnostics: jest.fn(),
          buildExportSummary: jest.fn(() => ({})),
        },
        overrides
      );
    }

    test('clicking the reset button asks for confirmation instead of deleting immediately', () => {
      const diagnosticsService = makeFakeDiagnosticsService();
      const { resetButton, resetConfirmButton } = renderWithFixture(container, { diagnosticsService });

      expect(resetConfirmButton).not.toBeVisible();
      resetButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(diagnosticsService.resetDiagnostics).not.toHaveBeenCalled();
      expect(resetConfirmButton).toBeVisible();
      expect(resetButton).not.toBeVisible();
    });

    test('cancelling the confirmation never calls resetDiagnostics and restores the plain button', () => {
      const diagnosticsService = makeFakeDiagnosticsService();
      const { resetButton, resetCancelButton, resetConfirm } = renderWithFixture(container, { diagnosticsService });

      resetButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      resetCancelButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(diagnosticsService.resetDiagnostics).not.toHaveBeenCalled();
      expect(resetConfirm).not.toBeVisible();
      expect(resetButton).toBeVisible();
    });

    test('confirming calls diagnostics.resetDiagnostics(), shows a success message and refreshes the counters/errors sections', () => {
      const diagnosticsService = makeFakeDiagnosticsService({
        getCounters: jest
          .fn()
          .mockReturnValueOnce({ 'gameStarted:parejas': 4 })
          .mockReturnValue({}),
        getErrors: jest
          .fn()
          .mockReturnValueOnce([{ date: '2026-08-20', mode: 'parejas', category: 'render', code: 'BOARD_RENDER_FAILED' }])
          .mockReturnValue([]),
      });

      const { resetButton, resetConfirmButton, resetStatus } = renderWithFixture(container, {
        diagnosticsService,
        counters: undefined,
        errors: undefined,
      });

      expect(container.textContent).toContain('BOARD_RENDER_FAILED');

      resetButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      resetConfirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(diagnosticsService.resetDiagnostics).toHaveBeenCalledTimes(1);
      expect(resetStatus.textContent).toBe(strings.actions.resetSuccessMessage);
      expect(container.textContent).toContain(strings.counters.emptyMessage);
      expect(container.textContent).toContain(strings.errors.emptyMessage);
      expect(container.textContent).not.toContain('BOARD_RENDER_FAILED');
      expect(resetButton).toBeVisible();
    });

    test('resetting never touches game progress -- only the injected diagnostics service is called', () => {
      const diagnosticsService = makeFakeDiagnosticsService();
      const { resetButton, resetConfirmButton } = renderWithFixture(container, { diagnosticsService });

      resetButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      resetConfirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(diagnosticsService.resetDiagnostics).toHaveBeenCalledWith();
    });
  });

  describe('manual export (TRIOFSND-320)', () => {
    function makeFakeDiagnosticsService(overrides) {
      return Object.assign(
        {
          getCounters: jest.fn(() => ({})),
          getErrors: jest.fn(() => []),
          resetDiagnostics: jest.fn(),
          buildExportSummary: jest.fn(() => ({ counters: { selectorOpen: 2 }, errorCounts: {}, totalErrors: 0 })),
        },
        overrides
      );
    }

    test('never builds or delivers an export without an explicit click', () => {
      const diagnosticsService = makeFakeDiagnosticsService();
      renderWithFixture(container, { diagnosticsService });

      expect(diagnosticsService.buildExportSummary).not.toHaveBeenCalled();
    });

    test('clicking export builds the summary and copies it to the clipboard when available, with no network call', async () => {
      const diagnosticsService = makeFakeDiagnosticsService();
      const copyToClipboard = jest.fn(() => Promise.resolve());
      const downloadFile = jest.fn();

      const { exportButton, exportStatus } = renderWithFixture(container, {
        diagnosticsService,
        copyToClipboard,
        downloadFile,
      });

      exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await flushPromises();

      expect(diagnosticsService.buildExportSummary).toHaveBeenCalledTimes(1);
      expect(copyToClipboard).toHaveBeenCalledWith(JSON.stringify({ counters: { selectorOpen: 2 }, errorCounts: {}, totalErrors: 0 }, null, 2));
      expect(downloadFile).not.toHaveBeenCalled();
      expect(exportStatus.textContent).toBe(strings.actions.exportCopiedMessage);
    });

    test('falls back to a local download when the clipboard is unavailable/fails', async () => {
      const diagnosticsService = makeFakeDiagnosticsService();
      const copyToClipboard = jest.fn(() => Promise.reject(new Error('no clipboard')));
      const downloadFile = jest.fn(() => true);

      const { exportButton, exportStatus } = renderWithFixture(container, {
        diagnosticsService,
        copyToClipboard,
        downloadFile,
      });

      exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await flushPromises();

      expect(downloadFile).toHaveBeenCalledTimes(1);
      expect(exportStatus.textContent).toBe(strings.actions.exportDownloadedMessage);
    });

    test('reports failure when neither clipboard nor download succeed, still without touching the network', async () => {
      const diagnosticsService = makeFakeDiagnosticsService();
      const copyToClipboard = jest.fn(() => Promise.reject(new Error('no clipboard')));
      const downloadFile = jest.fn(() => false);

      const { exportButton, exportStatus } = renderWithFixture(container, {
        diagnosticsService,
        copyToClipboard,
        downloadFile,
      });

      exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await flushPromises();

      expect(exportStatus.textContent).toBe(strings.actions.exportFailedMessage);
    });

    test('the exported summary never contains a name or a free-text answer', () => {
      const diagnosticsService = makeFakeDiagnosticsService({
        buildExportSummary: jest.fn(() => ({
          counters: { 'gameStarted:parejas': 3 },
          errorCounts: { 'parejas:render:BOARD_RENDER_FAILED': 1 },
          totalErrors: 1,
          sevenDayRetention: false,
        })),
      });

      const { exportButton } = renderWithFixture(container, { diagnosticsService });
      exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const summary = diagnosticsService.buildExportSummary.mock.results[0].value;
      expect(JSON.stringify(summary)).not.toMatch(/Rex|Tiranosaurio/);
    });
  });
});
