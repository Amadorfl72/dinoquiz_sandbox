const { finalizeGame } = require('../scoreManager');

describe('TRIOFSND-40: Actualizar mejor puntuación en localStorage', () => {
  let mockLocalStorage;
  let mockShowNewBestScoreMessage;

  beforeEach(() => {
    mockLocalStorage = {};
    mockShowNewBestScoreMessage = jest.fn();

    global.localStorage = {
      getItem: jest.fn((key) => mockLocalStorage[key] || null),
      setItem: jest.fn((key, value) => { mockLocalStorage[key] = value; }),
      clear: jest.fn(() => { mockLocalStorage = {}; })
    };

    // Assuming the module uses a global function or callback to show the message
    global.showNewBestScoreMessage = mockShowNewBestScoreMessage;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.showNewBestScoreMessage;
  });

  test('should update best score in localStorage and show message if current score is greater', () => {
    mockLocalStorage['bestScore'] = '100';
    finalizeGame(150);

    expect(global.localStorage.setItem).toHaveBeenCalledWith('bestScore', '150');
    expect(mockShowNewBestScoreMessage).toHaveBeenCalledTimes(1);
  });

  test('should not update best score and omit message if current score is lower', () => {
    mockLocalStorage['bestScore'] = '200';
    finalizeGame(150);

    expect(global.localStorage.setItem).not.toHaveBeenCalled();
    expect(mockShowNewBestScoreMessage).not.toHaveBeenCalled();
  });

  test('should not update best score and omit message if current score is equal', () => {
    mockLocalStorage['bestScore'] = '150';
    finalizeGame(150);

    expect(global.localStorage.setItem).not.toHaveBeenCalled();
    expect(mockShowNewBestScoreMessage).not.toHaveBeenCalled();
  });

  test('should set best score and show message if no best score exists in localStorage', () => {
    finalizeGame(50);

    expect(global.localStorage.setItem).toHaveBeenCalledWith('bestScore', '50');
    expect(mockShowNewBestScoreMessage).toHaveBeenCalledTimes(1);
  });
});