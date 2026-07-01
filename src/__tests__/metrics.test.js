import { startGame } from '../gameService';
import axios from 'axios';

jest.mock('axios');

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send game_started metric to backend', async () => {
    axios.post.mockResolvedValue({ data: {} });

    await startGame();

    expect(axios.post).toHaveBeenCalledWith('/metrics', { event: 'game_started' });
  });
});