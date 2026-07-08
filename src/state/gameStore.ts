export interface Answer {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
}

export interface GameState {
  score: number;
  questionIndex: number;
  answers: Answer[];
}

export const createInitialGameState = (): GameState => ({
  score: 0,
  questionIndex: 0,
  answers: [],
});

type Listener = (state: GameState) => void;

function createGameStore(initial: GameState) {
  let state = initial;
  const listeners = new Set<Listener>();

  const notify = () => listeners.forEach((listener) => listener(state));

  return {
    getState: (): GameState => state,
    setState: (partial: Partial<GameState>): void => {
      state = { ...state, ...partial };
      notify();
    },
    resetGame: (): void => {
      state = createInitialGameState();
      notify();
    },
    subscribe: (listener: Listener): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const gameStore = createGameStore(createInitialGameState());
