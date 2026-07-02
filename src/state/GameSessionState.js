class GameSessionState {
  constructor() {
    this.selectedQuestions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
  }

  initializeSession(questions) {
    this.selectedQuestions = questions;
    this.currentQuestionIndex = 0;
    this.score = 0;
  }

  getCurrentQuestion() {
    return this.selectedQuestions[this.currentQuestionIndex];
  }

  moveToNextQuestion() {
    if (this.currentQuestionIndex < this.selectedQuestions.length - 1) {
      this.currentQuestionIndex++;
      return true;
    }
    return false;
  }

  incrementScore() {
    this.score++;
  }

  getScore() {
    return this.score;
  }
}

export default GameSessionState;