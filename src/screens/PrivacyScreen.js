'use strict';

/**
 * Privacy policy screen (TRIOFSND-116): static content, in plain language
 * for both children and their guardians, explaining what data is handled,
 * for what purpose, what rights apply and how to contact the data
 * controller. Reachable from the home screen in a single tap and offering
 * a "back to home" control (AC-16). All copy comes from the i18n resource
 * (see src/i18n) — no hardcoded strings here, per AC-15.
 *
 * Each policy point is its own `<section>` with a heading, so screen
 * readers can navigate the page section by section instead of one long
 * block of text.
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');

function renderPrivacyScreen(container, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { privacy: strings } = getStrings(locale);

  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'privacy-screen';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'privacy-screen__back-button';
  backButton.textContent = strings.backButton;
  backButton.setAttribute('aria-label', strings.backButtonAriaLabel);
  backButton.addEventListener('click', () => {
    if (typeof options.onBack === 'function') {
      options.onBack();
    }
  });

  const title = document.createElement('h1');
  title.className = 'privacy-screen__title';
  title.textContent = strings.title;

  const intro = document.createElement('p');
  intro.className = 'privacy-screen__intro';
  intro.textContent = strings.intro;

  const sectionsContainer = document.createElement('div');
  sectionsContainer.className = 'privacy-screen__sections';

  const sectionEls = strings.sections.map((section) => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'privacy-screen__section';

    const heading = document.createElement('h2');
    heading.className = 'privacy-screen__section-heading';
    heading.textContent = section.heading;

    const body = document.createElement('p');
    body.className = 'privacy-screen__section-body';
    body.textContent = section.body;

    sectionEl.appendChild(heading);
    sectionEl.appendChild(body);
    sectionsContainer.appendChild(sectionEl);

    return sectionEl;
  });

  root.appendChild(backButton);
  root.appendChild(title);
  root.appendChild(intro);
  root.appendChild(sectionsContainer);
  container.appendChild(root);

  return { root, backButton, title, intro, sectionsContainer, sectionEls };
}

module.exports = { renderPrivacyScreen };
