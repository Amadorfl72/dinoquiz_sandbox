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

    this.questions.forEach((question, index) => {
      if (!question.id) {
        throw new Error(`Question at index ${index} has no id`);
      }
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

  getRandomQuestions(count = 10) {
    if (count > this.questions.length) {
      throw new Error(`Requested ${count} questions but only ${this.questions.length} available`);
    }

    const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export default new QuestionService();