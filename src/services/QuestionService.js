import questions from '../data/questions.json';

class QuestionService {
  constructor() {
    this.validateQuestions(questions);
    this.questions = questions;
  }

  validateQuestions(questions) {
    if (!Array.isArray(questions)) {
      throw new Error('Questions must be an array');
    }

    questions.forEach((question, index) => {
      if (!question.id) {
        throw new Error(`Question at index ${index} must have an id`);
      }
      if (!question.text) {
        throw new Error(`Question at index ${index} must have a text`);
      }
      if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
        throw new Error(`Question at index ${index} must have at least 2 options`);
      }
      if (question.correctAnswer === undefined || question.correctAnswer === null) {
        throw new Error(`Question at index ${index} must have a correctAnswer`);
      }
      if (!question.funFact) {
        throw new Error(`Question at index ${index} must have a funFact`);
      }
      if (!question.dinosaurImage) {
        throw new Error(`Question at index ${index} must have a dinosaurImage`);
      }
    });
  }

  getRandomQuestions(count = 10) {
    if (count > this.questions.length) {
      throw new Error(`Cannot select ${count} questions from a pool of ${this.questions.length}`);
    }

    const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export default new QuestionService();