export const selectRandomQuestions = (questions, count) => {
  if (questions.length < count) {
    throw new Error('Not enough questions in the pool');
  }
  
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const shuffleAnswers = (question) => {
  const answers = [...question.answers];
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
};