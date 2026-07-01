import { shuffleOptions } from '../utils/shuffleOptions';

describe('shuffleOptions', () => {
  it('should return an array with the same length as input', () => {
    const options = [
      { text: 'Option 1', isCorrect: false },
      { text: 'Option 2', isCorrect: true },
      { text: 'Option 3', isCorrect: false }
    ];
    const shuffled = shuffleOptions(options);
    expect(shuffled.length).toBe(options.length);
  });

  it('should contain all the same elements as input', () => {
    const options = [
      { text: 'Option 1', isCorrect: false },
      { text: 'Option 2', isCorrect: true },
      { text: 'Option 3', isCorrect: false }
    ];
    const shuffled = shuffleOptions(options);
    options.forEach(option => {
      expect(shuffled).toContainEqual(option);
    });
  });

  it('should not mutate the original array', () => {
    const options = [
      { text: 'Option 1', isCorrect: false },
      { text: 'Option 2', isCorrect: true },
      { text: 'Option 3', isCorrect: false }
    ];
    const optionsCopy = [...options];
    shuffleOptions(options);
    expect(options).toEqual(optionsCopy);
  });
});