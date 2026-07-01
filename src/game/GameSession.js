class GameSession {
  constructor(questions) {
    if (!questions || questions.length !== 10) {
      throw new Error('GameSession requires exactly 10 questions');
    }
    
    // Check for duplicate question IDs
    const questionIds = questions.map(q => q.id);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new Error('Duplicate question IDs found');
    }
    
    this.questions = questions;
    this.currentQuestionIndex = 0;
    this.selectedQuestions = [...questions]; // Use all provided questions
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
      if (this.streak > this.maxStreak) {
        this.maxStreak = this.streak;
      }
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

  getShownQuestionIds() {
    return Array.from(this.shownQuestionIds);
  }
}

export default GameSession;