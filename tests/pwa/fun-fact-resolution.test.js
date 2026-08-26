'use strict';

const path = require('path');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const strings = require('../../public/i18n/es.json');
const questions = require('../../public/data/questions.json');

// Bug report: "Scroll innecesario y Dato Curioso inexistente" — the fun-fact
// banner shows at the end of every question but its text is always blank.
// Root cause: prepareBrowserQuestions() resolved each question's
// `dato_curioso` key (e.g. "funFacts.trex-01") against `strings.funFacts`
// (already one level deep), so the "funFacts" segment was looked up twice
// and the lookup always missed.
describe('TRIOFSND: prepareBrowserQuestions resolves the real dato curioso text', () => {
  test('resolves a non-empty funFact for every question in the real bank, matching the i18n bundle', () => {
    const { prepareBrowserQuestions } = require(MAIN_JS_PATH);

    const prepared = prepareBrowserQuestions(questions, strings);

    expect(prepared.length).toBe(questions.length);
    prepared.forEach((question, index) => {
      const expectedKey = questions[index].dato_curioso.replace(/^funFacts\./, '');
      expect(question.funFact).toBe(strings.funFacts[expectedKey]);
      expect(question.funFact.trim()).not.toBe('');
    });
  });
});
