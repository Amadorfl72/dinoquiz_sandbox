/**
 * Minimal typed event bus for decoupled UI feedback.
 * Used to notify listeners (e.g. results screen) when the best score is updated.
 */
export type BestScoreUpdatedPayload = {
  previousBest: number;
  newBest: number;
};

export type AppEventMap = {
  'best-score-updated': BestScoreUpdatedPayload;
};

type Listener<T> = (payload: T) => void;

class EventBus {
  private listeners: { [K in keyof AppEventMap]?: Set<Listener<AppEventMap[K]>> } = {};

  on<K extends keyof AppEventMap>(event: K, listener: Listener<AppEventMap[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof AppEventMap>(event: K, listener: Listener<AppEventMap[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
    this.listeners[event]?.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        // Swallow listener errors so one bad subscriber doesn't break the flow.
        console.error(`[EventBus] Listener error for "${String(event)}":`, err);
      }
    });
  }

  clear(): void {
    this.listeners = {};
  }
}

export const eventBus = new EventBus();
export default eventBus;
