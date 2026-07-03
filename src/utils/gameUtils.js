// Utility functions for game logic

export function getRandomQuestions(allQuestions, count = 10) {
  // Create a copy of the array to avoid mutating the original
  const questionsCopy = [...allQuestions];
  const selectedQuestions = [];
  
  // Select questions randomly without repetition
  while (selectedQuestions.length < count && questionsCopy.length > 0) {
    const randomIndex = Math.floor(Math.random() * questionsCopy.length);
    selectedQuestions.push(questionsCopy.splice(randomIndex, 1)[0]);
  }
  
  return selectedQuestions;
}

export function resetGameState(setQuestions, setCurrentQuestionIndex, setScore, allQuestions) {
  // Select new random questions
  const newQuestions = getRandomQuestions(allQuestions);
  setQuestions(newQuestions);
  
  // Reset game progress
  setCurrentQuestionIndex(0);
  setScore(0);
}

export function initializeGame(allQuestions, setQuestions, setCurrentQuestionIndex, setScore) {
  const initialQuestions = getRandomQuestions(allQuestions);
  setQuestions(initialQuestions);
  setCurrentQuestionIndex(0);
  setScore(0);
}