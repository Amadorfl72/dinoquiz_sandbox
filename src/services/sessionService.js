class SessionService {
  constructor() {
    this.currentGame = null;
  }

  startNewGame(questions) {
    this.currentGame = {
      questions,
      currentQuestionIndex: 0,
      score: 0
    };
  }

  getCurrentGame() {
    return this.currentGame;
  }

  resetGame() {
    this.currentGame = null;
  }
}

export default new SessionService();