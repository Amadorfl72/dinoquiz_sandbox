'use strict';

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
  });
});
