// Utility functions for question selection and shuffling

export const selectRandomQuestions = (allQuestions, count = 10) => {
  // Create a copy of the array to avoid mutating the original
  const questionsCopy = [...allQuestions];
  const selectedQuestions = [];

  // Select questions without repetition
  for (let i = 0; i < count && questionsCopy.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * questionsCopy.length);
    selectedQuestions.push(questionsCopy[randomIndex]);
    questionsCopy.splice(randomIndex, 1);
  }

  return selectedQuestions;
};

export const shuffleAnswers = (question) => {
  // Create a copy of the answers array to avoid mutating the original
  const answersCopy = [...question.answers];
  
  // Shuffle the answers array
  for (let i = answersCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answersCopy[i], answersCopy[j]] = [answersCopy[j], answersCopy[i]];
  }

  return {
    ...question,
    answers: answersCopy
  };
};

export const prepareQuestionsForGame = (allQuestions, count = 10) => {
  const selectedQuestions = selectRandomQuestions(allQuestions, count);
  return selectedQuestions.map(question => shuffleAnswers(question));
};