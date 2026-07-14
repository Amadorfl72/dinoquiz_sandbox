import { readItem, writeItem } from './storage';

export const EVENTS_STORAGE_KEY = 'dinoquiz.events.v1';
export const MAX_STORED_EVENTS = 200;

export interface PartidaCompletadaEvent {
  type: 'partida_completada';
  timestamp: string;
  score: number;
  totalQuestions: number;
}

export type DinoQuizEvent = PartidaCompletadaEvent;

export function readEvents(): DinoQuizEvent[] {
  const raw = readItem(EVENTS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendEvent(event: DinoQuizEvent): void {
  const events = readEvents();
  events.push(event);
  const trimmed =
    events.length > MAX_STORED_EVENTS
      ? events.slice(events.length - MAX_STORED_EVENTS)
      : events;
  writeItem(EVENTS_STORAGE_KEY, JSON.stringify(trimmed));
}
