import { Question } from './Question';

const SESSION_LENGTH = 10;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class GameSession {
  private readonly selectedQuestions: Question[];
  private currentIndex: number;
  private finished: boolean;

  constructor(questionPool: Question[]) {
    this.selectedQuestions = shuffle(questionPool).slice(0, SESSION_LENGTH);
    this.currentIndex = 0;
    this.finished = false;
  }

  getSelectedQuestions(): Question[] {
    return this.selectedQuestions;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentQuestion(): Question | undefined {
    if (this.finished) {
      return undefined;
    }
    return this.selectedQuestions[this.currentIndex];
  }

  nextQuestion(): void {
    if (this.finished) {
      return;
    }
    if (this.currentIndex < this.selectedQuestions.length - 1) {
      this.currentIndex++;
    } else {
      this.finished = true;
    }
  }

  isFinished(): boolean {
    return this.finished;
  }
}
