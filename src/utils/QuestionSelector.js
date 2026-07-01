class QuestionSelector {
  constructor(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Questions must be a non-empty array');
    }
    this.questions = questions;
    this.usedQuestions = new Set();
  }

  getRandomQuestions(count) {
    if (typeof count !== 'number' || count <= 0) {
      throw new Error('Count must be a positive number');
    }

    if (count > this.questions.length) {
      throw new Error('Not enough questions available');
    }

    const availableQuestions = this.questions.filter(
      (_, index) => !this.usedQuestions.has(index)
    );

    if (availableQuestions.length < count) {
      this.usedQuestions.clear();
      return this.getRandomQuestions(count);
    }

    const selectedQuestions = [];
    while (selectedQuestions.length < count) {
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      const question = availableQuestions[randomIndex];
      if (!selectedQuestions.includes(question)) {
        selectedQuestions.push(question);
        this.usedQuestions.add(this.questions.indexOf(question));
      }
    }

    return selectedQuestions;
  }
}

export default QuestionSelector;