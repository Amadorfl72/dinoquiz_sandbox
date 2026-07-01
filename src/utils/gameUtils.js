export const selectRandomQuestions = (questions, count) => {
  if (questions.length < count) {
    throw new Error('Not enough questions in the pool');
  }
  
  // Secure random selection using crypto API
  const selectedIndices = new Set();
  const crypto = window.crypto || window.msCrypto;
  
  while (selectedIndices.size < count) {
    const randomValue = new Uint32Array(1);
    crypto.getRandomValues(randomValue);
    const index = randomValue[0] % questions.length;
    selectedIndices.add(index);
  }
  
  return Array.from(selectedIndices).map(i => {
    const question = {...questions[i]};
    question.options = shuffleAnswers(question);
    return question;
  });
};

export const shuffleAnswers = (question) => {
  if (!question || !question.answers) {
    throw new Error('Invalid question object');
  }
  
  // Secure shuffle using Fisher-Yates with crypto API
  const answers = [...question.answers];
  const crypto = window.crypto || window.msCrypto;
  
  for (let i = answers.length - 1; i > 0; i--) {
    const randomValue = new Uint32Array(1);
    crypto.getRandomValues(randomValue);
    const j = randomValue[0] % (i + 1);
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  
  return answers;
};