'use strict';

require('@testing-library/jest-dom');

const { renderHomeScreen } = require('../../public/scripts/homeScreen');
const i18n = require('../../src/i18n');

const { home: strings, privacy: privacyStrings, purchase: purchaseStrings } = i18n.getStrings('es');

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

  describe('mute preference (TRIOFSND-66)', () => {
    it('reflects options.muted on the mute button', () => {
      const { muteButton } = renderHomeScreen(container, { strings, privacyStrings, purchaseStrings, muted: true });

      expect(muteButton).toHaveAttribute('aria-pressed', 'true');
      expect(muteButton).toHaveAccessibleName(strings.globalControls.muteButton.unmuteLabel);
    });

    it('wires onToggleMute so a click reports the flipped state', () => {
      const onToggleMute = jest.fn();
      const { muteButton } = renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        muted: false,
        onToggleMute,
      });

      muteButton.click();

      expect(onToggleMute).toHaveBeenCalledWith(true);
      expect(muteButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('first-run tooltip wired into the bootstrap script (TRIOFSND-65)', () => {
    it('renderHome without tooltip options renders without the tooltip', () => {
      renderHomeScreen(container, { strings, privacyStrings, purchaseStrings });

      expect(container.querySelector('.home-screen__tooltip')).toBeNull();
    });

    it('shows the tooltip when showTooltip is true', () => {
      const { tooltip, playButton } = renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        showTooltip: true,
      });

      expect(tooltip).not.toBeNull();
      expect(playButton).toHaveAttribute('aria-describedby', tooltip.id);
    });

    it('does not render the tooltip when showTooltip is false', () => {
      renderHomeScreen(container, { strings, privacyStrings, purchaseStrings, showTooltip: false });

      expect(container.querySelector('.home-screen__tooltip')).toBeNull();
    });

    it('the tooltip dismiss callback fires on the first tap anywhere on screen', () => {
      const onTooltipDismiss = jest.fn();
      const { title } = renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        showTooltip: true,
        onTooltipDismiss,
      });

      title.click();

      expect(onTooltipDismiss).toHaveBeenCalledTimes(1);
      expect(container.querySelector('.home-screen__tooltip')).toBeNull();
    });

    it('the play button click callback fires on every tap', () => {
      const onPlayButtonClick = jest.fn();
      const { playButton } = renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        onPlayButtonClick,
      });

      playButton.click();
      playButton.click();

      expect(onPlayButtonClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Controles globales en Inicio', () => {
    it('clicking the privacy summary button opens its panel', () => {
      const { privacyButton, privacyPanel } = renderHomeScreen(container, { strings, privacyStrings, purchaseStrings });

      expect(privacyPanel.hidden).toBe(true);
      expect(privacyButton).toHaveAttribute('aria-expanded', 'false');

      privacyButton.click();

      expect(privacyPanel.hidden).toBe(false);
      expect(privacyButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('confirming the purchase invokes options.onPurchase (entry point into the IAP flow)', () => {
      const onPurchase = jest.fn();
      const { purchaseButton, purchaseConfirmButton } = renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        onPurchase,
      });

      purchaseButton.click();
      purchaseConfirmButton.click();

      expect(onPurchase).toHaveBeenCalledTimes(1);
    });

    it('confirming the purchase while offline shows a reconnect notice instead of calling onPurchase (TRIOFSND-112)', () => {
      const onPurchase = jest.fn();
      const { purchaseButton, purchaseConfirmButton, purchaseOfflineNotice } = renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        onPurchase,
        isOnline: () => false,
      });

      purchaseButton.click();
      expect(purchaseOfflineNotice.hidden).toBe(true);

      purchaseConfirmButton.click();

      expect(onPurchase).not.toHaveBeenCalled();
      expect(purchaseOfflineNotice.hidden).toBe(false);
      expect(purchaseOfflineNotice).toHaveTextContent(purchaseStrings.offlineNotice);
      expect(purchaseOfflineNotice).toHaveAttribute('role', 'alert');
    });

    it('retrying the purchase once back online hides the reconnect notice and invokes onPurchase', () => {
      const onPurchase = jest.fn();
      let online = false;
      const { purchaseButton, purchaseConfirmButton, purchaseOfflineNotice } = renderHomeScreen(container, {
        strings,
        privacyStrings,
        purchaseStrings,
        onPurchase,
        isOnline: () => online,
      });

      purchaseButton.click();
      purchaseConfirmButton.click();
      expect(purchaseOfflineNotice.hidden).toBe(false);

      online = true;
      purchaseConfirmButton.click();

      expect(purchaseOfflineNotice.hidden).toBe(true);
      expect(onPurchase).toHaveBeenCalledTimes(1);
    });

    it('global controls are grouped under an accessible, labeled group', () => {
      const { globalControls } = renderHomeScreen(container, { strings, privacyStrings, purchaseStrings });

      expect(globalControls).toHaveAttribute('role', 'group');
      expect(globalControls).toHaveAccessibleName(strings.globalControls.groupLabel);
    });
  });
});
