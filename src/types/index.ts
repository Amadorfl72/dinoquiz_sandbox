export interface AnalyticsEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface GameCompletedEvent {
  score: number;
  duration_ms: number;
  app_version: string;
}
