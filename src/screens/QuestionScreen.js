import { registerLocalEvent } from '../analytics/localEventLog.js';

export const MIN_ADVANCE_DELAY_MS = 400;

export class QuestionScreen {
  constructor({ questions, onFinish } = {}) {
    this.questions = questions || [];
    this.onFinish = onFinish || (() => {});
    this.currentIndex = 0;
    this.started = false;
  }

  start() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.currentIndex = 0;
    registerLocalEvent('partida_iniciada');
  }

  answer(selectedOption) {
    const question = this.questions[this.currentIndex];
    const isCorrect = Boolean(question) && question.correctOption === selectedOption;
    this.currentIndex += 1;
    if (this.currentIndex >= this.questions.length) {
      this.started = false;
      this.onFinish(isCorrect);
    }
    return isCorrect;
  }

  replay() {
    registerLocalEvent('replay_pulsado');
    this.started = false;
    this.start();
  }
}
