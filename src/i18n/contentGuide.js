'use strict';

/**
 * Content-guide guard (TRIOFSND-91, AC-7): words that would read as
 * negative/discouraging to a 6-8 year old. Any copy shown on a failed
 * answer (or elsewhere) must never contain these, matched as whole,
 * accent-stripped words rather than substrings (so e.g. "maleta" does not
 * trip the "mal" guard). Shared by every screen that renders child-facing
 * copy — see public/scripts/resultsScreen.js (motivational messages) and
 * public/scripts/questionScreen.js (wrong-answer feedback) — so the banned
 * list lives in exactly one place instead of drifting between them.
 */
const BANNED_WORDS = new Set([
  'mal',
  'malo',
  'mala',
  'malos',
  'malas',
  'fallo',
  'fallos',
  'fallaste',
  'fallar',
  'fallado',
  'perdiste',
  'perder',
  'perdido',
  'error',
  'errores',
  'incorrecto',
  'incorrecta',
  'triste',
  'nunca',
  'fracaso',
  'fracasar',
  'peor',
  'pena',
  'lastima',
  'lento',
  'lenta',
  'torpe',
  'tonto',
  'tonta',
]);

function normalizeToWords(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function findBannedWords(text) {
  return normalizeToWords(text).filter((word) => BANNED_WORDS.has(word));
}

/** Returns an error string describing the negative language found, or null if `text` is clean. */
function validateCopy(text, label) {
  const found = findBannedWords(text);
  if (found.length === 0) {
    return null;
  }
  return (label ? label + ': ' : '') + '"' + text + '" contains negative language: ' + found.join(', ');
}

module.exports = {
  BANNED_WORDS,
  normalizeToWords,
  findBannedWords,
  validateCopy,
};
