'use strict';

/**
 * i18n resource loader. v1 only ships the 'es' locale (see PRD: "v1 solo
 * expone locale 'es'"); unknown locales fall back to it so components never
 * receive `undefined` strings.
 *
 * The resource file lives under public/i18n so the same JSON can be fetched
 * at runtime by the browser app shell (see public/scripts/main.js), instead
 * of being duplicated between src/ and public/.
 */

const es = require('../../public/i18n/es.json');

const LOCALES = Object.freeze({
  es,
});

const DEFAULT_LOCALE = 'es';

// The canonical list of runtime-supported locales, derived from the single
// LOCALES registry above so callers (e.g. the PRECACHE completeness gate) never
// maintain their own parallel locale list. v1 exposes only 'es'.
const SUPPORTED_LOCALES = Object.freeze(Object.keys(LOCALES));

function getStrings(locale) {
  return LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
}

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getStrings,
};
