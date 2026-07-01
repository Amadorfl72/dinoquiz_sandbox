const AsyncStorage = require('@react-native-async-storage/async-storage');
const { saveGameState, loadGameState } = require('../src/state/sessionManager');

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('Session State Management Unit Tests (TRIOFSND-11)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not persist game state when closing the app', async () => {
    const gameState = { 
      board: [['X', 'O', ''], ['', '', ''], ['', '', '']], 
      currentPlayer: 'X' 
    };
    
    await saveGameState(gameState);
    
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('should return null when loading game state on app reopen', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    
    const state = await loadGameState();
    
    expect(state).toBeNull();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('game_state');
  });
});