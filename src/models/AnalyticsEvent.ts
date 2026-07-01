import mongoose, { Document, Schema } from 'mongoose';

interface IAnalyticsEvent extends Document {
  eventType: string;
  timestamp: Date;
  payload: {
    first_apertura?: boolean;
    tooltip_id?: string;
    [key: string]: any;
  };
  deviceInfo: {
    userAgent: string;
    screenSize: string;
    language: string;
  };
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
  eventType: { type: String, required: true, enum: ['app_open', 'tooltip_shown', 'tooltip_dismissed'] },
  timestamp: { type: Date, default: Date.now },
  payload: { type: Schema.Types.Mixed, required: true },
  deviceInfo: { type: Schema.Types.Mixed, required: true }
});

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);