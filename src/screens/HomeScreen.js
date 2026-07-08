'use strict';

/**
 * Home ("Inicio") screen: title, the '¡Jugar!' entry point, a discreet,
 * optional notice for parents about local-only progress, and the privacy
 * policy entry point (TRIOFSND-116, AC-16: reachable in a single tap from
 * here). All copy comes from the i18n resource (see src/i18n) — no
 * hardcoded strings here, per AC-15.
 *
 * The notice uses `role="note"` (ancillary content, not part of the main
 * reading/interaction flow) so assistive tech can reach it without a child
 * needing to interact with it first — it is never focused programmatically
 * and never sits between the title and the play button in tab order.
 *
 * The privacy button is icon-first (visible per the PRD) but carries an
 * `aria-label` with the full "open privacy policy" phrasing, since the
 * short visible caption alone ("Privacidad") would be an ambiguous
 * accessible name out of context.
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');

const PRIVACY_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>' +
  '<path d="M9 12l2 2 4-4"/>' +
  '</svg>';

function renderHomeScreen(container, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { home: strings } = getStrings(locale);

  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'home-screen';

  const title = document.createElement('h1');
  title.className = 'home-screen__title';
  title.textContent = strings.title;

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'home-screen__play-button';
  playButton.textContent = strings.playButton;

  const parentalNotice = document.createElement('p');
  parentalNotice.className = 'home-screen__parental-notice';
  parentalNotice.setAttribute('role', 'note');
  parentalNotice.setAttribute('aria-label', strings.parentalNotice.label);
  parentalNotice.textContent = strings.parentalNotice.message;

  const privacyButton = document.createElement('button');
  privacyButton.type = 'button';
  privacyButton.className = 'home-screen__privacy-button';
  privacyButton.setAttribute('aria-label', strings.privacyButton.ariaLabel);

  const privacyIcon = document.createElement('span');
  privacyIcon.className = 'home-screen__privacy-icon';
  privacyIcon.setAttribute('aria-hidden', 'true');
  privacyIcon.innerHTML = PRIVACY_ICON_SVG;

  const privacyLabel = document.createElement('span');
  privacyLabel.className = 'home-screen__privacy-label';
  privacyLabel.textContent = strings.privacyButton.label;

  privacyButton.appendChild(privacyIcon);
  privacyButton.appendChild(privacyLabel);
  privacyButton.addEventListener('click', () => {
    if (typeof options.onOpenPrivacy === 'function') {
      options.onOpenPrivacy();
    }
  });

  root.appendChild(title);
  root.appendChild(playButton);
  root.appendChild(parentalNotice);
  root.appendChild(privacyButton);
  container.appendChild(root);

  return { root, playButton, parentalNotice, privacyButton };
}

module.exports = { renderHomeScreen };
