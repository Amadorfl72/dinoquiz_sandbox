import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  eventType: 'app_open' | 'tooltip_shown' | 'tooltip_dismissed' | 'partida_iniciada' | 'pregunta_respondida' | 'partida_completada' | 'replay_pulsado' | 'mute_toggled';
  timestamp: Date;
  firstApertura?: boolean;
  tooltipId?: string;
  deviceInfo: {
    model: string;
    osVersion: string;
    language: string;
    screenSize: string;
    userAgent: string;
  };
  sessionId: string;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
  eventType: { type: String, required: true, enum: ['app_open', 'tooltip_shown', 'tooltip_dismissed', 'partida_iniciada', 'pregunta_respondida', 'partida_completada', 'replay_pulsado', 'mute_toggled'] },
  timestamp: { type: Date, required: true, default: Date.now },
  firstApertura: { type: Boolean },
  tooltipId: { type: String },
  deviceInfo: {
    model: { type: String, required: true },
    osVersion: { type: String, required: true },
    language: { type: String, required: true },
    screenSize: { type: String, required: true },
    userAgent: { type: String, required: true }
  },
  sessionId: { type: String, required: true }
});

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);