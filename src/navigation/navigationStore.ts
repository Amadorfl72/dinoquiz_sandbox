export type Screen = 'home' | 'quiz' | 'results';

type Listener = (screen: Screen) => void;

function createNavigationStore(initialScreen: Screen) {
  let screen = initialScreen;
  const listeners = new Set<Listener>();

  const setScreen = (next: Screen): void => {
    screen = next;
    listeners.forEach((listener) => listener(screen));
  };

  return {
    getScreen: (): Screen => screen,
    goToHome: (): void => setScreen('home'),
    goToQuiz: (): void => setScreen('quiz'),
    goToResults: (): void => setScreen('results'),
    subscribe: (listener: Listener): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const navigationStore = createNavigationStore('home');
