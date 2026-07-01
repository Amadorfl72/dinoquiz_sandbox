class GameSession {
  constructor(questions) {
    if (!questions || questions.length !== 10) {
      throw new Error('GameSession requires exactly 10 questions');
    }
    
    const questionIds = questions.map(q => q.id);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new Error('Duplicate question IDs found');
    }
    
    this.questions = Object.freeze([...questions]);
    this.currentQuestionIndex = 0;
    this.selectedQuestions = [...questions];
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.seenFacts = new Set();
    this.shownQuestionIds = new Set();
  }

  getCurrentQuestion() {
    return this.selectedQuestions[this.currentQuestionIndex];
  }

  answerQuestion(isCorrect) {
    const currentQuestion = this.getCurrentQuestion();
    
    if (this.shownQuestionIds.has(currentQuestion.id)) {
      throw new Error('Question already answered');
    }
    
    if (isCorrect) {
      this.score += 1;
      this.streak += 1;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
    } else {
      this.streak = 0;
    }
    
    this.seenFacts.add(currentQuestion.fact);
    this.shownQuestionIds.add(currentQuestion.id);
  }

  nextQuestion() {
    if (this.isGameOver()) {
      throw new Error('Game session is already over');
    }
    
    this.currentQuestionIndex += 1;
    return !this.isGameOver();
  }

  isGameOver() {
    return this.currentQuestionIndex >= this.selectedQuestions.length;
  }

  getResults() {
    const stars = this.score <= 3 ? 1 : this.score <= 6 ? 2 : 3;
    return Object.freeze({
      score: this.score,
      maxStreak: this.maxStreak,
      stars: stars,
      seenFacts: this.seenFacts.size
    });
  }

  getShownQuestionIds() {
    return Array.from(this.shownQuestionIds);
  }
}

export default GameSession;