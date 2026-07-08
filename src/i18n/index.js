'use strict';

/**
 * i18n resource loader. v1 only ships the 'es' locale (see PRD: "v1 solo
 * expone locale 'es'"); unknown locales fall back to it so components never
 * receive `undefined` strings.
 */

const es = require('./es.json');

const LOCALES = Object.freeze({
  es,
});

const DEFAULT_LOCALE = 'es';

function getStrings(locale) {
  return LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
}

module.exports = {
  DEFAULT_LOCALE,
  getStrings,
};
