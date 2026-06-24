export interface Question {
  id: string;
  statement: string;
  options: string[];
  correctAnswerIndex: number;
  dinosaurId: string;
  funFact: string;
  imageUrl: string;
}

export type PreparedQuestion = Question;

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * @param array The array to shuffle.
 * @returns A new shuffled array.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Selects a specified number of random questions without repetition from a pool.
 * @param questions The pool of questions.
 * @param count The number of questions to select.
 * @returns An array of selected questions.
 */
export function selectRandomQuestions(questions: Question[], count: number): Question[] {
  if (count > questions.length) {
    throw new Error('Cannot select more questions than available in the pool.');
  }
  return shuffleArray(questions).slice(0, count);
}

/**
 * Prepares a question for display by shuffling its answer options.
 * @param question The original question.
 * @returns A new question object with shuffled options and updated correct answer index.
 */
export function prepareQuestionForDisplay(question: Question): PreparedQuestion {
  const correctAnswer = question.options[question.correctAnswerIndex];
  const shuffledOptions = shuffleArray(question.options);
  const shuffledCorrectAnswerIndex = shuffledOptions.indexOf(correctAnswer);

  return {
    ...question,
    options: shuffledOptions,
    correctAnswerIndex: shuffledCorrectAnswerIndex,
  };
}

/**
 * Generates a new game session: selects 10 random questions and prepares them for display.
 * @param questions The pool of questions.
 * @param count The number of questions per game (default 10).
 * @returns An array of prepared questions.
 */
export function generateGameSession(questions: Question[], count: number = 10): PreparedQuestion[] {
  const selectedQuestions = selectRandomQuestions(questions, count);
  return selectedQuestions.map(prepareQuestionForDisplay);
}
