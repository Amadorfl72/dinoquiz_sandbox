class SessionService {
  constructor() {
    this.currentGame = null;
    this.currentQuestionIndex = 0;
    this.score = 0;
  }

  startNewGame(questions) {
    this.currentGame = questions;
    this.currentQuestionIndex = 0;
    this.score = 0;
    return this.currentGame;
  }

  getCurrentQuestion() {
    if (!this.currentGame || this.currentQuestionIndex >= this.currentGame.length) {
      return null;
    }
    return this.currentGame[this.currentQuestionIndex];
  }

  submitAnswer(isCorrect) {
    if (isCorrect) {
      this.score++;
    }
    this.currentQuestionIndex++;
    return {
      nextQuestion: this.getCurrentQuestion(),
      isGameOver: this.currentQuestionIndex >= this.currentGame.length,
      score: this.score
    };
  }

  clearSession() {
    this.currentGame = null;
    this.currentQuestionIndex = 0;
    this.score = 0;
  }
}

export default new SessionService();