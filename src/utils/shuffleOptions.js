export const shuffleOptions = (options) => {
  // Create a copy of the options array to avoid mutating the original
  const shuffledOptions = [...options];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }
  
  return shuffledOptions;
};