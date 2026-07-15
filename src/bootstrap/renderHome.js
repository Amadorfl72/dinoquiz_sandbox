import { createDefaultStorage } from '../storage/createDefaultStorage.js';
import { AudioManager } from '../audio/audioManager.js';

export const MUTED_STORAGE_KEY = 'dinoquiz:muted';
export const TOOLTIP_SEEN_STORAGE_KEY = 'dinoquiz:jugar_tooltip_seen';
export const FIRST_TAP_JUGAR_STORAGE_KEY = 'dinoquiz:first_tap_jugar_count';

export function renderHome(strings, options = {}) {
  const storage = options.storage || createDefaultStorage();
  options.storage = storage;

  const audioManager = options.audioManager || new AudioManager();
  options.audioManager = audioManager;

  const root = options.root || (typeof document !== 'undefined' ? document.querySelector('#app') : null);

  const isMuted = storage.getItem(MUTED_STORAGE_KEY) === 'true';
  if (isMuted) {
    audioManager.muteAll();
  } else {
    audioManager.unmuteAll();
  }

  options.onToggleMute = () => {
    const nextMuted = !audioManager.isMuted();
    if (nextMuted) {
      audioManager.muteAll();
    } else {
      audioManager.unmuteAll();
    }
    storage.setItem(MUTED_STORAGE_KEY, String(nextMuted));
    return nextMuted;
  };

  const tooltipSeen = storage.getItem(TOOLTIP_SEEN_STORAGE_KEY) === 'true';
  options.tooltipVisible = !tooltipSeen;
  if (tooltipSeen) {
    if (typeof options.hideTooltip === 'function') options.hideTooltip();
  } else if (typeof options.showTooltip === 'function') {
    options.showTooltip();
  }

  options.onTooltipDismiss = () => {
    storage.setItem(TOOLTIP_SEEN_STORAGE_KEY, 'true');
    options.tooltipVisible = false;
    if (typeof options.hideTooltip === 'function') options.hideTooltip();
  };

  options.onPlayButtonClick = () => {
    const currentCount = Number.parseInt(storage.getItem(FIRST_TAP_JUGAR_STORAGE_KEY) || '0', 10);
    storage.setItem(FIRST_TAP_JUGAR_STORAGE_KEY, String(currentCount + 1));
  };

  if (root) {
    root.innerHTML = `
      <section class="home">
        <h1>${strings.title}</h1>
        <button type="button" class="play-button">${strings.playCta}</button>
        <button type="button" class="mute-toggle" aria-pressed="${isMuted}">${
          isMuted ? strings.unmuteLabel : strings.muteLabel
        }</button>
        <section class="privacy">${strings.privacyNotice}</section>
        <section class="purchase">${strings.purchaseOffer}</section>
      </section>
    `;

    const muteButton = root.querySelector('.mute-toggle');
    if (muteButton) {
      muteButton.addEventListener('click', options.onToggleMute);
    }

    const playButton = root.querySelector('.play-button');
    if (playButton) {
      playButton.addEventListener('click', options.onPlayButtonClick);
    }
  }

  return options;
}
