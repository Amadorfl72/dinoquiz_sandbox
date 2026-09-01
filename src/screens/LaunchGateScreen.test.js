'use strict';

require('@testing-library/jest-dom');
const { getByRole, getAllByRole } = require('@testing-library/dom');

const { renderLaunchGateScreen } = require('./LaunchGateScreen');
const { GATE_IDS } = require('../services/launchGate');
const { GOAL_IDS, GOAL_STATUS } = require('../services/productGoals');
const { launchGate: strings } = require('../../public/i18n/es.json');

function passingGatesReport() {
  const gates = {};
  Object.values(GATE_IDS).forEach((gateId) => {
    gates[gateId] = { pass: true };
  });
  return { pass: true, gates };
}

function renderWithFixture(container, overrides) {
  return renderLaunchGateScreen(
    container,
    Object.assign(
      {
        strings,
        candidateVersion: '0.1.0',
        swVersion: 'v35',
        lastPreloadAt: '2026-08-20T10:00:00.000Z',
        gatesReport: passingGatesReport(),
        productGoals: {},
      },
      overrides
    )
  );
}

describe('LaunchGateScreen rendering', () => {
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

    backButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  describe('version section', () => {
    test('shows the candidate version, SW_VERSION and precache status from the resolved values', () => {
      renderWithFixture(container, {
        candidateVersion: '0.1.0',
        swVersion: 'v35',
        lastPreloadAt: '2026-08-20T10:00:00.000Z',
      });

      expect(getByRole(container, 'heading', { name: strings.version.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('0.1.0');
      expect(container.textContent).toContain('v35');
      expect(container.textContent).toContain(strings.version.precacheStatus.complete);
    });

    test('falls back to the unknown-value copy and "pending" precache status when nothing was ever recorded', () => {
      renderWithFixture(container, { candidateVersion: null, swVersion: null, lastPreloadAt: null });

      expect(container.textContent).toContain(strings.version.precacheStatus.pending);
      const unknownOccurrences = container.textContent.split(strings.version.unknownValue).length - 1;
      expect(unknownOccurrences).toBeGreaterThanOrEqual(3);
    });
  });

  describe('gates section', () => {
    test('lists every gate with a text status, never color alone, and a passing overall banner', () => {
      renderWithFixture(container, { gatesReport: passingGatesReport() });

      expect(getByRole(container, 'heading', { name: strings.gates.heading })).toBeInTheDocument();
      expect(container.textContent).toContain(strings.gates.overall.pass);
      Object.values(GATE_IDS).forEach((gateId) => {
        expect(container.textContent).toContain(strings.gates.names[gateId]);
      });
      const statusOccurrences = container.textContent.split(strings.gates.statusLabels.pass).length - 1;
      expect(statusOccurrences).toBeGreaterThanOrEqual(Object.values(GATE_IDS).length);
    });

    test('shows a blocked gate as "Bloqueado" text with the failing overall banner', () => {
      const gates = passingGatesReport().gates;
      gates[GATE_IDS.SILUETAS] = { pass: false };
      renderWithFixture(container, { gatesReport: { pass: false, gates } });

      expect(container.textContent).toContain(strings.gates.overall.fail);
      expect(container.textContent).toContain(strings.gates.statusLabels.fail);
    });

    test('renders every gate as "unknown" when the launch-gate service could not be evaluated', () => {
      renderWithFixture(container, { gatesReport: null });

      expect(container.textContent).toContain(strings.gates.overall.unknown);
      const unknownOccurrences = container.textContent.split(strings.gates.statusLabels.unknown).length - 1;
      expect(unknownOccurrences).toBeGreaterThanOrEqual(Object.values(GATE_IDS).length);
    });
  });

  describe('product goals section', () => {
    test('shows an approved goal with its target and approval date', () => {
      renderWithFixture(container, {
        productGoals: {
          [GOAL_IDS.FINALIZACION]: { status: GOAL_STATUS.APROBADO, target: 70, approvedAt: 1755680400000 },
        },
      });

      expect(getByRole(container, 'heading', { name: strings.productGoals.heading })).toBeInTheDocument();
      expect(container.textContent).toContain(strings.productGoals.names[GOAL_IDS.FINALIZACION]);
      expect(container.textContent).toContain(strings.productGoals.statusLabels.aprobado);
      expect(container.textContent).toContain('70');
    });

    test('shows an unrecorded goal as "pendiente" text', () => {
      renderWithFixture(container, { productGoals: {} });

      Object.values(GOAL_IDS).forEach((goalId) => {
        expect(container.textContent).toContain(strings.productGoals.names[goalId]);
      });
      const pendienteOccurrences = container.textContent.split(strings.productGoals.statusLabels.pendiente).length - 1;
      expect(pendienteOccurrences).toBe(Object.values(GOAL_IDS).length);
    });
  });

  test('every gate item and goal item exposes readable text content (no status conveyed by color alone)', () => {
    renderWithFixture(container);
    const items = getAllByRole(container, 'listitem');
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.textContent.trim().length).toBeGreaterThan(0);
    });
  });
});
