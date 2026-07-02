class GameSession {
  constructor(questions) {
    if (questions.length < 10) {
      throw new Error('Not enough questions in bank');
    }
    
    // Shuffle and select 10 unique questions
    this.questions = [...questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    
    this.currentQuestionIndex = 0;
    this.completed = false;
  }

  getCurrentQuestion() {
    return this.questions[this.currentQuestionIndex];
  }

  next() {
    if (this.completed) {
      return false;
    }
    
    this.currentQuestionIndex++;
    
    if (this.currentQuestionIndex >= this.questions.length) {
      this.completed = true;
      return false;
    }
    
    return true;
  }

  isComplete() {
    return this.completed;
  }
}

export default GameSession;