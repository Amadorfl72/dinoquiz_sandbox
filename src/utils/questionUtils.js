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

export const shuffleQuestionOptions = (question) => {
  // Create a copy of the options array to avoid mutating the original
  const optionsCopy = [...question.options];
  
  // Find the correct option before shuffling
  const correctOption = optionsCopy.find(option => option.isCorrect);

  // Shuffle the options array
  for (let i = optionsCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optionsCopy[i], optionsCopy[j]] = [optionsCopy[j], optionsCopy[i]];
  }

  return {
    ...question,
    options: optionsCopy
  };
};

export const prepareQuestionsForGame = (allQuestions, count = 10) => {
  const selectedQuestions = selectRandomQuestions(allQuestions, count);
  return selectedQuestions.map(question => shuffleQuestionOptions(question));
};