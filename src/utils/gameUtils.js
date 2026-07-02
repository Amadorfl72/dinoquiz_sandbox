export const initializeGame = (questions) => {
  // Select 10 unique random questions from the pool
  const shuffledQuestions = [...questions].sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffledQuestions.slice(0, 10);

  // Shuffle the answer options for each question
  const questionsWithShuffledAnswers = selectedQuestions.map(question => {
    const shuffledAnswers = [...question.answers].sort(() => 0.5 - Math.random());
    return {
      ...question,
      answers: shuffledAnswers
    };
  });

  return questionsWithShuffledAnswers;
};