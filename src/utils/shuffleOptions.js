export const shuffleOptions = (options) => {
  // Create a copy of the options array to avoid mutating the original
  const shuffledOptions = [...options];
  
  // Fisher-Yates shuffle algorithm - secure randomization
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    // Use crypto.getRandomValues for secure random number generation
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }
  
  return shuffledOptions;
};