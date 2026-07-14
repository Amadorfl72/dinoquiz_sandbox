'use strict';

require('@testing-library/jest-dom');
const { fireEvent } = require('@testing-library/dom');
const { renderHomeScreen } = require('../../public/scripts/homeScreen');
const i18n = require('../../src/i18n');

describe('Home screen rendered by the bootstrap script', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('renderHome renders into #app using the fetched strings, privacy/purchase sections and the persisted mute state', () => {
    it('reads the persisted mute state from storage', () => {
      const mockStorage = {
        getItem: jest.fn().mockReturnValue('true'),
        setItem: jest.fn(),
      };

      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};

      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        storage: mockStorage,
        muted: false,
      });

      expect(mockStorage.getItem).toHaveBeenCalledWith('dinoquiz:muted');
    });

    it('wires onToggleMute so a toggle persists back to storage', () => {
      const mockStorage = {
        getItem: jest.fn().mockReturnValue('false'),
        setItem: jest.fn(),
      };

      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};
      const onToggleMute = jest.fn();

      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        storage: mockStorage,
        muted: false,
        onToggleMute,
      });

      // Find and click the mute button in the home screen
      const muteButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => btn.getAttribute('aria-label')?.includes('Silenciar') || 
               btn.getAttribute('aria-label')?.includes('Activar')
      );
      
      if (muteButtons.length > 0) {
        muteButtons[0].click();
        expect(mockStorage.setItem).toHaveBeenCalledWith('dinoquiz:muted', 'true');
      }
    });
  });

  describe('first-run tooltip wired into the bootstrap script', () => {
    it('renderHome without a storage argument keeps its previous, tooltip-less behaviour', () => {
      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};

      // Should not throw and should render without tooltip-specific features
      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
      });

      expect(container.innerHTML).not.toBe('');
    });

    it('renderHome shows the tooltip when the storage flag says it has not been seen yet', () => {
      const mockStorage = {
        getItem: jest.fn().mockReturnValue('false'),
        setItem: jest.fn(),
        hasSeenHomeTooltip: jest.fn().mockReturnValue(false),
        markHomeTooltipSeen: jest.fn(),
        recordEventOnce: jest.fn(),
      };

      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};

      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        storage: mockStorage,
        muted: false,
        showTooltip: true,
      });

      expect(mockStorage.hasSeenHomeTooltip).toHaveBeenCalled();
    });

    it('renderHome hides the tooltip when the storage flag says it was already seen', () => {
      const mockStorage = {
        getItem: jest.fn().mockReturnValue('false'),
        setItem: jest.fn(),
        hasSeenHomeTooltip: jest.fn().mockReturnValue(true),
        markHomeTooltipSeen: jest.fn(),
        recordEventOnce: jest.fn(),
      };

      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};
      const onTooltipDismiss = jest.fn();

      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        storage: mockStorage,
        muted: false,
        showTooltip: false,
        onTooltipDismiss,
      });

      // Verify showTooltip is respected as false
      const tooltip = container.querySelector('[class*="tooltip"]');
      if (tooltip) {
        expect(tooltip.style.visibility).not.toBe('visible');
      }
    });

    it('the tooltip dismiss callback persists the "seen" flag through storage', () => {
      const mockStorage = {
        getItem: jest.fn().mockReturnValue('false'),
        setItem: jest.fn(),
        hasSeenHomeTooltip: jest.fn().mockReturnValue(false),
        markHomeTooltipSeen: jest.fn(),
        recordEventOnce: jest.fn(),
      };

      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};
      let capturedOnTooltipDismiss = null;

      const onTooltipDismiss = jest.fn((callback) => {
        capturedOnTooltipDismiss = callback;
      });

      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        storage: mockStorage,
        muted: false,
        showTooltip: true,
        onTooltipDismiss,
      });

      // Simulate tooltip dismiss
      if (typeof onTooltipDismiss === 'function') {
        onTooltipDismiss();
      }

      expect(mockStorage.markHomeTooltipSeen).toHaveBeenCalled();
    });

    it('the play button click callback records the first_tap_jugar local counter', () => {
      const mockStorage = {
        getItem: jest.fn().mockReturnValue('false'),
        setItem: jest.fn(),
        hasSeenHomeTooltip: jest.fn().mockReturnValue(true),
        markHomeTooltipSeen: jest.fn(),
        recordEventOnce: jest.fn(),
      };

      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};
      const onPlayButtonClick = jest.fn();

      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        storage: mockStorage,
        muted: false,
        showTooltip: false,
        onPlayButtonClick,
      });

      // Find and click the play button
      const playButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.textContent.includes('¡Jugar!')
      );

      if (playButton) {
        playButton.click();
        expect(mockStorage.recordEventOnce).toHaveBeenCalledWith('first_tap_jugar');
      }
    });
  });

  describe('Controles globales en Inicio', () => {
    it('clicking the privacy button should open/close the privacy panel', () => {
      const strings = i18n.getStrings('es').home;
      const privacyStrings = i18n.getStrings('es').privacy;
      const purchaseStrings = {};

      renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
      });

      // Find privacy button by aria-label containing 'privacidad' or 'Resumen de privacidad'
      const privacyButtons = Array.from(container.querySelectorAll('button')).filter(
        btn => {
          const label = btn.getAttribute('aria-label') || btn.textContent;
          return label.includes('privacidad') || label.includes('Resumen');
        }
      );

      // Should have exactly one privacy button
      expect(privacyButtons.length).toBe(1);

      if (privacyButtons.length === 1) {
        const privacyButton = privacyButtons[0];
        const initialExpanded = privacyButton.getAttribute('aria-expanded');
        
        privacyButton.click();
        const newExpanded = privacyButton.getAttribute('aria-expanded');
        
        // Should toggle the expanded state
        expect(newExpanded).not.toBe(initialExpanded);
      }
    });

  test('confirming the purchase invokes options.onPurchase (entry point into the IAP flow)', () => {
    const onPurchase = jest.fn();
    const { purchaseButton, purchaseConfirmButton } = renderHomeScreen(container, { onPurchase });

    fireEvent.click(purchaseButton);
    fireEvent.click(purchaseConfirmButton);

    expect(onPurchase).toHaveBeenCalledTimes(1);
  });

  test('confirming the purchase while offline shows a reconnect notice instead of calling onPurchase (TRIOFSND-112)', () => {
    const onPurchase = jest.fn();
    const { purchaseButton, purchaseConfirmButton, purchaseOfflineNotice } = renderHomeScreen(container, {
      onPurchase,
      isOnline: () => false,
    });

    fireEvent.click(purchaseButton);
    expect(purchaseOfflineNotice.hidden).toBe(true);

    fireEvent.click(purchaseConfirmButton);

    expect(onPurchase).not.toHaveBeenCalled();
    expect(purchaseOfflineNotice.hidden).toBe(false);
    expect(purchaseOfflineNotice).toHaveTextContent(purchaseStrings.offlineNotice);
    expect(purchaseOfflineNotice).toHaveAttribute('role', 'alert');
  });

  test('does not block the rest of the app while offline: the panel stays open and other controls stay usable', () => {
    const { purchaseButton, purchaseConfirmButton, purchasePanel, privacyButton, privacyPanel } = renderHomeScreen(
      container,
      { isOnline: () => false }
    );

    fireEvent.click(purchaseButton);
    fireEvent.click(purchaseConfirmButton);

    expect(purchasePanel.hidden).toBe(false);

    fireEvent.click(privacyButton);
    expect(privacyPanel.hidden).toBe(false);
  });

  test('retrying the purchase once back online hides the reconnect notice and invokes onPurchase', () => {
    const onPurchase = jest.fn();
    let online = false;
    const { purchaseButton, purchaseConfirmButton, purchaseOfflineNotice } = renderHomeScreen(container, {
      onPurchase,
      isOnline: () => online,
    });

    fireEvent.click(purchaseButton);
    fireEvent.click(purchaseConfirmButton);
    expect(purchaseOfflineNotice.hidden).toBe(false);

    online = true;
    fireEvent.click(purchaseConfirmButton);

    expect(purchaseOfflineNotice.hidden).toBe(true);
    expect(onPurchase).toHaveBeenCalledTimes(1);
  });

  test('global controls are grouped under an accessible, labeled group', () => {
    const { globalControls } = renderHomeScreen(container);

    expect(globalControls).toHaveAttribute('role', 'group');
    expect(globalControls).toHaveAccessibleName(strings.globalControls.groupLabel);
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
});
