'use strict';

const { BANNED_WORDS, findBannedWords, validateCopy } = require('./contentGuide');

describe('TRIOFSND-91: content-guide guard for negative language', () => {
  test('flags a banned word', () => {
    expect(findBannedWords('¡Qué mal lo has hecho!')).toEqual(['mal']);
  });

  test('matches banned words regardless of accents or case', () => {
    expect(findBannedWords('¡ERROR, fallaste otra vez!')).toEqual(
      expect.arrayContaining(['error', 'fallaste'])
    );
  });

  test('does not flag words that merely contain a banned word as a substring', () => {
    expect(findBannedWords('¡Aprender sobre dinosaurios mola muchísimo!')).toEqual([]);
  });

  test('returns an empty array for clean, positive copy', () => {
    expect(findBannedWords('¡Buen intento! La respuesta correcta es esta:')).toEqual([]);
  });

  test('validateCopy returns null for clean copy', () => {
    expect(validateCopy('¡Genial, acertaste!')).toBeNull();
  });

  test('validateCopy describes the negative language found, including the optional label', () => {
    const error = validateCopy('Fallaste otra vez', 'question.feedback.incorrect');
    expect(error).toMatch(/^question\.feedback\.incorrect:/);
    expect(error).toMatch(/negative language: fallaste/);
  });

  test('BANNED_WORDS is a non-empty set of lowercase, accent-free words', () => {
    expect(BANNED_WORDS.size).toBeGreaterThan(0);
    BANNED_WORDS.forEach((word) => {
      expect(word).toBe(word.toLowerCase());
      expect(word).toMatch(/^[a-z]+$/);
    });
  });
});
