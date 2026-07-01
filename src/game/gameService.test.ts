import { startGame } from './gameService';
import * as metrics from '../services/metrics';

describe('gameService.startGame', () => {
  const sendMetricSpy = jest.spyOn(metrics, 'sendMetric');

  beforeEach(() => {
    sendMetricSpy.mockReset();
    sendMetricSpy.mockResolvedValue(undefined);
  });

  afterAll(() => {
    sendMetricSpy.mockRestore();
  });

  it('emits the game_started metric when a game starts', async () => {
    await startGame();

    expect(sendMetricSpy).toHaveBeenCalledTimes(1);
    expect(sendMetricSpy).toHaveBeenCalledWith({ event: 'game_started' });
  });

  it('still starts the game even if the metric fails', async () => {
    sendMetricSpy.mockRejectedValueOnce(new Error('boom'));

    const result = await startGame();

    expect(result).toBe(true);
    expect(sendMetricSpy).toHaveBeenCalledWith({ event: 'game_started' });
  });
});
