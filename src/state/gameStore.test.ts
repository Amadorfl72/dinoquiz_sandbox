import { gameStore, createInitialGameState } from './gameStore';

describe('gameStore', () => {
  afterEach(() => {
    gameStore.resetGame();
  });

  it('resets score, question index and answers to their initial values', () => {
    gameStore.setState({
      score: 6,
      questionIndex: 9,
      answers: [{ questionId: 'q1', selectedOptionId: 'a', correct: true }],
    });

    gameStore.resetGame();

    expect(gameStore.getState()).toEqual(createInitialGameState());
  });

  it('notifies subscribers when the game is reset', () => {
    const listener = jest.fn();
    const unsubscribe = gameStore.subscribe(listener);

    gameStore.resetGame();

    expect(listener).toHaveBeenCalledWith(createInitialGameState());
    unsubscribe();
  });
});
