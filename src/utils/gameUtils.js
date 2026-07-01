export const selectRandomQuestions = (questions, count) => {
  if (questions.length < count) {
    throw new Error('Not enough questions in the pool');
  }
  
  // Fisher-Yates shuffle algorithm for better randomness
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export const shuffleAnswers = (question) => {
  if (!question || !question.answers) {
    throw new Error('Invalid question object');
  }
  
  const answers = [...question.answers];
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
};