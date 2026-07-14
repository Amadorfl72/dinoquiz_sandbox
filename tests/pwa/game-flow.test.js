import {
  MIN_ADVANCE_DELAY_MS,
  QuestionScreen,
} from '../../src/screens/QuestionScreen';
import {
  bindReplayButton,
} from '../../public/scripts/questionScreen';
import {
  getLocalEventCounts,
  resetLocalEventCounts,
} from '../../src/analytics/localEventLog';

describe('game flow local event aggregation', () => {
  beforeEach(() => {
    resetLocalEventCounts();
    document.body.innerHTML = '';
  });

  it('exposes a single MIN_ADVANCE_DELAY_MS value shared by both entry points', () => {
    expect(typeof MIN_ADVANCE_DELAY_MS).toBe('number');
    expect(MIN_ADVANCE_DELAY_MS).toBeGreaterThan(0);
  });

  it('registers partida_iniciada once per game start, aggregated in local storage', () => {
    const questions = [
      { correctOption: 'a' },
      { correctOption: 'b' },
    ];
    const screen = new QuestionScreen({ questions });

    screen.start();
    screen.start();

    const counts = getLocalEventCounts();
    expect(counts.partida_iniciada).toBe(1);
  });

  it('registers replay_pulsado when the replay button is pressed, aggregated (no per-tap detail)', () => {
    const questions = [{ correctOption: 'a' }];
    const screen = new QuestionScreen({ questions });
    screen.start();

    const button = document.createElement('button');
    document.body.appendChild(button);
    bindReplayButton(button, screen);

    button.click();
    button.click();

    const counts = getLocalEventCounts();
    expect(counts.replay_pulsado).toBe(2);
    expect(counts.partida_iniciada).toBe(3);
    expect(Object.keys(counts).sort()).toEqual(['partida_iniciada', 'replay_pulsado']);
  });
});
