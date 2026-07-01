const {
  shuffleOptions,
  shuffleQuestionOptions,
} = require('../src/optionShuffler');

describe('TRIOFSND-17: Option Shuffling', () => {
  const baseOptions = ['Option A', 'Option B', 'Option C'];

  describe('shuffleOptions', () => {
    it('returns an array containing exactly the same 3 options', () => {
      const result = shuffleOptions(baseOptions);
      expect(result).toHaveLength(3);
      expect(result.slice().sort()).toEqual(baseOptions.slice().sort());
    });

    it('does not mutate the original options array', () => {
      const original = [...baseOptions];
      shuffleOptions(original);
      expect(original).toEqual(baseOptions);
    });

    it('returns a new array instance', () => {
      const result = shuffleOptions(baseOptions);
      expect(result).not.toBe(baseOptions);
    });

    it('preserves the content of each option (no data loss)', () => {
      const result = shuffleOptions(baseOptions);
      baseOptions.forEach((opt) => {
        expect(result).toContain(opt);
      });
    });

    it('produces multiple distinct orderings over many invocations (randomness)', () => {
      const orderings = new Set();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        orderings.add(shuffleOptions(baseOptions).join('|'));
      }
      // With 3 options there are 6 possible permutations.
      // We expect at least 3 distinct orderings to confirm randomness.
      expect(orderings.size).toBeGreaterThanOrEqual(3);
    });

    it('only produces valid permutations of the input', () => {
      const validPermutations = [
        ['Option A', 'Option B', 'Option C'],
        ['Option A', 'Option C', 'Option B'],
        ['Option B', 'Option A', 'Option C'],
        ['Option B', 'Option C', 'Option A'],
        ['Option C', 'Option A', 'Option B'],
        ['Option C', 'Option B', 'Option A'],
      ];
      for (let i = 0; i < 100; i++) {
        const result = shuffleOptions(baseOptions);
        expect(validPermutations).toContainEqual(result);
      }
    });

    it('handles object-based options while preserving identity', () => {
      const opts = [
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
        { id: 3, text: 'C' },
      ];
      const result = shuffleOptions(opts);
      expect(result).toHaveLength(3);
      opts.forEach((opt) => expect(result).toContain(opt));
    });
  });

  describe('shuffleQuestionOptions', () => {
    const question = {
      id: 'q1',
      prompt: 'What is 2 + 2?',
      options: ['3', '4', '5'],
      correctIndex: 1,
    };

    it('returns shuffled options with the same 3 elements', () => {
      const { options, correctIndex } = shuffleQuestionOptions(question);
      expect(options).toHaveLength(3);
      expect(options.slice().sort()).toEqual(
        question.options.slice().sort()
      );
    });

    it('updates correctIndex to point to the originally correct option', () => {
      const correctText = question.options[question.correctIndex];
      const { options, correctIndex } = shuffleQuestionOptions(question);
      expect(options[correctIndex]).toBe(correctText);
    });

    it('keeps correctIndex within valid bounds after shuffle', () => {
      const { correctIndex } = shuffleQuestionOptions(question);
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      expect(correctIndex).toBeLessThan(3);
    });

    it('does not mutate the original question object', () => {
      const snapshot = JSON.parse(JSON.stringify(question));
      shuffleQuestionOptions(question);
      expect(question).toEqual(snapshot);
    });

    it('maintains correct answer mapping across many shuffles', () => {
      const correctText = question.options[question.correctIndex];
      for (let i = 0; i < 200; i++) {
        const { options, correctIndex } = shuffleQuestionOptions(question);
        expect(options[correctIndex]).toBe(correctText);
      }
    });

    it('produces randomized orderings for a question', () => {
      const orderings = new Set();
      for (let i = 0; i < 500; i++) {
        const { options } = shuffleQuestionOptions(question);
        orderings.add(options.join('|'));
      }
      expect(orderings.size).toBeGreaterThanOrEqual(3);
    });
  });
});
