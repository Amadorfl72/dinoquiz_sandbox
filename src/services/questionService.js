import questionBank from '../data/questions.json';

const QUESTIONS_PER_ROUND = 10;

const shuffle = (items) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const selectQuestions = (count = QUESTIONS_PER_ROUND) => {
  const roundSize = Math.min(count, questionBank.length);
  return shuffle(questionBank).slice(0, roundSize);
};
