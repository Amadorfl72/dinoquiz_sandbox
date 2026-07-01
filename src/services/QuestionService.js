import questions from '../data/questions.json';

class QuestionService {
  constructor() {
    this.questions = questions;
    this.validateQuestions();
  }

  validateQuestions() {
    if (!Array.isArray(this.questions) || this.questions.length === 0) {
      throw new Error('Invalid questions bank: must be a non-empty array');
    }

    if (this.questions.length < 10) {
      throw new Error('Question bank must contain at least 10 questions');
    }

    const seenIds = new Set();
    this.questions.forEach((question, index) => {
      if (!question.id) {
        throw new Error(`Question at index ${index} has no id`);
      }
      if (seenIds.has(question.id)) {
        throw new Error(`Duplicate question id: ${question.id}`);
      }
      seenIds.add(question.id);
      if (!question.text) {
        throw new Error(`Question ${question.id} has no text`);
      }
      if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
        throw new Error(`Question ${question.id} has invalid options`);
      }
      if (question.correctOption === undefined || question.correctOption === null) {
        throw new Error(`Question ${question.id} has no correctOption specified`);
      }
      if (!question.funFact) {
        throw new Error(`Question ${question.id} has no funFact`);
      }
      if (!question.dinoImage) {
        throw new Error(`Question ${question.id} has no dinoImage`);
      }
    });
  }

  selectQuestionsForSession(count = 10) {
    if (count > this.questions.length) {
      throw new Error(`Requested ${count} questions but only ${this.questions.length} available`);
    }

    // Fisher-Yates shuffle for unbiased random selection
    const shuffled = [...this.questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, count);
  }

  getBankSize() {
    return this.questions.length;
  }

  getBank() {
    return [...this.questions];
  }

  isBankValid() {
    try {
      this.validateQuestions();
      return true;
    } catch {
      return false;
    }
  }
}

export default new QuestionService();