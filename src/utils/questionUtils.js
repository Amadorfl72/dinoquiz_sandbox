export const shuffleQuestions = (questions) => {
  const shuffledQuestions = [...questions];
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }
  return shuffledQuestions;
};

export const updateCorrectAnswerIndex = (question, shuffledOptions) => {
  const correctAnswerText = question.options[question.correctAnswerIndex];
  const newCorrectAnswerIndex = shuffledOptions.findIndex(option => option === correctAnswerText);
  return newCorrectAnswerIndex;
};