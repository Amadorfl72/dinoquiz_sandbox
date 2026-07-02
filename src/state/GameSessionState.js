// DEPRECATED - Use src/game/GameSession.ts instead
// This file will be removed in a future update

class GameSessionState {
  constructor() {
    this.selectedQuestions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
  }

  initializeSession(questions) {
    if (questions.length !== 10) {
      throw new Error('Session must be initialized with exactly 10 questions');
    }
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

  isSessionComplete() {
    return this.currentQuestionIndex >= this.selectedQuestions.length - 1;
  }
}

export default GameSessionState;