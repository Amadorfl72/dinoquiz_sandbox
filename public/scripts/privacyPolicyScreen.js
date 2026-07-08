'use strict';

/**
 * Privacy policy ("Política de privacidad") screen: static, kid-and-parent
 * friendly copy on what data DinoQuiz handles, why, user rights and the
 * contact for the data controller — all sourced from the i18n resource
 * (public/i18n/es.json), reachable from Home in a single tap (see
 * public/scripts/homeScreen.js) with a "Volver" control back to Home.
 *
 * Same dual CommonJS/browser-global pattern as public/scripts/homeScreen.js
 * so it loads both under Jest (`require`) and as a plain `<script>` with no
 * bundler (see public/index.html).
 *
 * Accessibility: the heading receives focus on mount so screen readers
 * announce the new view immediately after the tap that opened it, without
 * relying on a full page navigation.
 */

(function () {
  function resolveDefaultStrings(locale) {
    if (typeof require === 'function') {
      var i18n = require('../../src/i18n');
      return i18n.getStrings(locale || i18n.DEFAULT_LOCALE).privacyPolicy;
    }
    return null;
  }

  function renderSection(section) {
    var sectionEl = document.createElement('section');
    sectionEl.className = 'privacy-policy-screen__section';

    var heading = document.createElement('h2');
    heading.id = 'privacy-policy-' + section.id + '-heading';
    heading.textContent = section.heading;
    sectionEl.setAttribute('aria-labelledby', heading.id);
    sectionEl.appendChild(heading);

    section.paragraphs.forEach(function (paragraph) {
      var p = document.createElement('p');
      p.textContent = paragraph;
      sectionEl.appendChild(p);
    });

    return sectionEl;
  }

  function renderPrivacyPolicyScreen(container, options) {
    options = options || {};
    var strings = options.strings || resolveDefaultStrings(options.locale);

    container.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'privacy-policy-screen';

    var backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'privacy-policy-screen__back-button';
    backButton.textContent = strings.backButtonLabel;
    backButton.setAttribute('aria-label', strings.backButtonLabel);
    if (typeof options.onBack === 'function') {
      backButton.addEventListener('click', options.onBack);
    }

    var title = document.createElement('h1');
    title.className = 'privacy-policy-screen__title';
    title.textContent = strings.screenTitle;
    title.tabIndex = -1;

    var updatedAt = document.createElement('p');
    updatedAt.className = 'privacy-policy-screen__updated-at';
    updatedAt.textContent = strings.updatedAt;

    var callout = document.createElement('section');
    callout.className = 'privacy-policy-screen__callout';
    callout.setAttribute('aria-labelledby', 'privacy-policy-kids-heading');

    var calloutHeading = document.createElement('h2');
    calloutHeading.id = 'privacy-policy-kids-heading';
    calloutHeading.textContent = strings.kidsCallout.heading;

    var calloutBody = document.createElement('p');
    calloutBody.textContent = strings.kidsCallout.body;

    callout.appendChild(calloutHeading);
    callout.appendChild(calloutBody);

    var sectionEls = strings.sections.map(renderSection);

    root.appendChild(backButton);
    root.appendChild(title);
    root.appendChild(updatedAt);
    root.appendChild(callout);
    sectionEls.forEach(function (sectionEl) {
      root.appendChild(sectionEl);
    });
    container.appendChild(root);

    if (typeof title.focus === 'function') {
      title.focus();
    }

    return { root: root, backButton: backButton, title: title, sections: sectionEls };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderPrivacyPolicyScreen: renderPrivacyPolicyScreen };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.screens = window.DinoQuiz.screens || {};
    window.DinoQuiz.screens.renderPrivacyPolicyScreen = renderPrivacyPolicyScreen;
  }
})();
