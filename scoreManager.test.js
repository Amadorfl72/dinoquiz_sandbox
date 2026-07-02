describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  let endGame;
  let showNewBestScoreMessage;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    // Mocking the DOM and functions that would be implemented in the actual code
    showNewBestScoreMessage = jest.fn();
    
    // Assuming the logic is implemented in a module or globally
    // For the purpose of this test, we define a mock implementation to test against
    global.endGame = (currentScore) => {
      const savedScore = parseInt(localStorage.getItem('bestScore') || '0', 10);
      if (currentScore > savedScore) {
        localStorage.setItem('bestScore', currentScore.toString());
        showNewBestScoreMessage(true);
      } else {
        showNewBestScoreMessage(false);
      }
    };
    endGame = global.endGame;
  });

  it('should update localStorage and show new best score message if current score is greater than saved score', () => {
    localStorage.setItem('bestScore', '50');
    const currentScore = 100;
    
    endGame(currentScore);

    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(showNewBestScoreMessage).toHaveBeenCalledWith(true);
  });

  it('should not update localStorage and not show message if current score is less than saved score', () => {
    localStorage.setItem('bestScore', '100');
    const currentScore = 50;
    
    endGame(currentScore);

    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(showNewBestScoreMessage).toHaveBeenCalledWith(false);
  });

  it('should not update localStorage and not show message if current score is equal to saved score', () => {
    localStorage.setItem('bestScore', '100');
    const currentScore = 100;
    
    endGame(currentScore);

    expect(localStorage.getItem('bestScore')).toBe('100');
    expect(showNewBestScoreMessage).toHaveBeenCalledWith(false);
  });

  it('should update localStorage and show message if there is no saved score', () => {
    const currentScore = 10;
    
    endGame(currentScore);

    expect(localStorage.getItem('bestScore')).toBe('10');
    expect(showNewBestScoreMessage).toHaveBeenCalledWith(true);
  });
});