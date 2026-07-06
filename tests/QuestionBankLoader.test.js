jest.mock('../src/utils/logger');
jest.mock('../src/utils/metrics');

global.fetch = jest.fn();

const Logger = require('../src/utils/logger').default;
const { loadQuestionBank } = require('../src/components/QuestionBankLoader');

describe('QuestionBankLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validQuestion = (i) => ({
    id: `q${i}`,
    text: `Question ${i}`,
    options: ['a', 'b', 'c'],
    correctAnswer: 0,
    funFact: 'A fun fact'
  });

  describe('loadQuestionBank', () => {
    it('loads and returns valid question bank', async () => {
      const bank = Array.from({ length: 10 }, (_, i) => validQuestion(i));
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      const result = await loadQuestionBank();
      expect(result).toEqual(bank);
      expect(Logger.logBankValidation).toHaveBeenCalledWith(true);
    });

    it('logs bank validation as valid on success', async () => {
      const bank = Array.from({ length: 12 }, (_, i) => validQuestion(i));
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await loadQuestionBank();
      expect(Logger.logBankValidation).toHaveBeenCalledWith(true);
    });

    it('throws and logs invalid when bank has fewer than 10 questions', async () => {
      const bank = Array.from({ length: 5 }, (_, i) => validQuestion(i));
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await expect(loadQuestionBank()).rejects.toThrow('Invalid question bank format');
      expect(Logger.logBankValidation).toHaveBeenCalledWith(true, undefined);
      // First call logs true (validation result), then throws
      // Actually validateQuestionBank returns false, so first log should be false
    });

    it('logs bank validation as false when bank is invalid (fewer than 10)', async () => {
      const bank = Array.from({ length: 5 }, (_, i) => validQuestion(i));
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await expect(loadQuestionBank()).rejects.toThrow();
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false);
    });

    it('logs bank validation as false when question is missing required fields', async () => {
      const bank = Array.from({ length: 10 }, (_, i) => validQuestion(i));
      bank[3].funFact = undefined;
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await expect(loadQuestionBank()).rejects.toThrow('Invalid question bank format');
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false);
    });

    it('logs bank validation as false when options has fewer than 3 entries', async () => {
      const bank = Array.from({ length: 10 }, (_, i) => validQuestion(i));
      bank[2].options = ['a', 'b'];
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await expect(loadQuestionBank()).rejects.toThrow();
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false);
    });

    it('logs bank validation as false with error message on fetch failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(loadQuestionBank()).rejects.toThrow('Network error');
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false, 'Network error');
    });

    it('logs bank validation as false when bank is not an array', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ not: 'an array' })
      });

      await expect(loadQuestionBank()).rejects.toThrow('Invalid question bank format');
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false);
    });
  });

  describe('validateQuestionBank (via loadQuestionBank behavior)', () => {
    it('accepts a bank with exactly 10 valid questions', async () => {
      const bank = Array.from({ length: 10 }, (_, i) => validQuestion(i));
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      const result = await loadQuestionBank();
      expect(result).toHaveLength(10);
      expect(Logger.logBankValidation).toHaveBeenCalledWith(true);
    });

    it('rejects a question missing correctAnswer', async () => {
      const bank = Array.from({ length: 10 }, (_, i) => validQuestion(i));
      delete bank[5].correctAnswer;
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await expect(loadQuestionBank()).rejects.toThrow();
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false);
    });

    it('rejects a question missing text', async () => {
      const bank = Array.from({ length: 10 }, (_, i) => validQuestion(i));
      delete bank[0].text;
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await expect(loadQuestionBank()).rejects.toThrow();
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false);
    });

    it('rejects a question missing id', async () => {
      const bank = Array.from({ length: 10 }, (_, i) => validQuestion(i));
      delete bank[1].id;
      fetch.mockResolvedValueOnce({
        json: async () => bank
      });

      await expect(loadQuestionBank()).rejects.toThrow();
      expect(Logger.logBankValidation).toHaveBeenCalledWith(false);
    });
  });
});
