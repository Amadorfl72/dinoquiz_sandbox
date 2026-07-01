class GameSession {
  constructor(questions) {
    this.questions = questions;
    this.currentQuestionIndex = 0;
    this.selectedQuestions = this.selectRandomQuestions();
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.seenFacts = new Set();
  }

  selectRandomQuestions() {
    const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
  }

  getCurrentQuestion() {
    return this.selectedQuestions[this.currentQuestionIndex];
  }

  answerQuestion(isCorrect) {
    if (isCorrect) {
      this.score += 1;
      this.streak += 1;
      if (this.streak > this.maxStreak) {
        this.maxStreak = this.streak;
      }
    } else {
      this.streak = 0;
    }
    const currentQuestion = this.getCurrentQuestion();
    this.seenFacts.add(currentQuestion.fact);
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.selectedQuestions.length - 1) {
      this.currentQuestionIndex += 1;
      return true;
    }
    return false;
  }

  isGameOver() {
    return this.currentQuestionIndex >= this.selectedQuestions.length - 1;
  }

  getResults() {
    const stars = this.score <= 3 ? 1 : this.score <= 6 ? 2 : 3;
    return {
      score: this.score,
      maxStreak: this.maxStreak,
      stars: stars,
      seenFacts: this.seenFacts.size
    };
  }
}

export default GameSession;