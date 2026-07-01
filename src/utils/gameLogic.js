import questions from '../data/questions.json';

let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

const selectNewQuestions = () => {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  currentQuestions = shuffled.slice(0, 10);
  return currentQuestions;
};

const resetGame = (newQuestions) => {
  currentQuestions = newQuestions || selectNewQuestions();
  currentQuestionIndex = 0;
  score = 0;
};

export { currentQuestions, currentQuestionIndex, score, selectNewQuestions, resetGame };