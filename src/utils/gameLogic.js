import questions from '../data/questions.json';

let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

const selectNewQuestions = async () => {
  // Create a copy of the questions array to avoid mutating the original
  const questionPool = [...questions];
  const selectedQuestions = [];
  
  // Select 10 unique questions randomly
  while (selectedQuestions.length < 10 && questionPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * questionPool.length);
    selectedQuestions.push(questionPool.splice(randomIndex, 1)[0]);
  }
  
  currentQuestions = selectedQuestions;
  return currentQuestions;
};

const resetGame = (newQuestions) => {
  currentQuestions = newQuestions || [];
  currentQuestionIndex = 0;
  score = 0;
  return {
    currentQuestions,
    currentQuestionIndex,
    score
  };
};

export { currentQuestions, currentQuestionIndex, score, selectNewQuestions, resetGame };