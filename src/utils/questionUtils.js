export const shuffleQuestions = (questions) => {
  const shuffledQuestions = [...questions];
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }
  return shuffledQuestions;
};

export const shuffleQuestionAnswers = (question) => {
  const shuffledAnswers = [...question.answers];
  for (let i = shuffledAnswers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
  }
  const correctAnswerText = question.answers[question.correctAnswerIndex];
  const newCorrectAnswerIndex = shuffledAnswers.findIndex(answer => answer === correctAnswerText);
  return {
    ...question,
    answers: shuffledAnswers,
    correctAnswerIndex: newCorrectAnswerIndex
  };
};