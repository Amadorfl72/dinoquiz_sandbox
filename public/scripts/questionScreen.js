export { MIN_ADVANCE_DELAY_MS, QuestionScreen } from '../../src/screens/QuestionScreen.js';
export {
  registerLocalEvent,
  getLocalEventCounts,
  resetLocalEventCounts,
} from '../../src/analytics/localEventLog.js';

export function bindReplayButton(buttonEl, questionScreen) {
  if (!buttonEl || !questionScreen) {
    return;
  }
  buttonEl.addEventListener('click', () => {
    questionScreen.replay();
  });
}
