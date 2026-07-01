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
  eventType: { 
    type: String, 
    required: true, 
    enum: ['app_open', 'tooltip_shown', 'tooltip_dismissed'] 
  },
  timestamp: { type: Date, default: Date.now },
  payload: { 
    type: Schema.Types.Mixed, 
    required: true,
    validate: {
      validator: function(payload: any) {
        // Ensure required fields are present based on eventType
        if (this.eventType === 'app_open' && typeof payload.first_apertura !== 'boolean') {
          return false;
        }
        if ((this.eventType === 'tooltip_shown' || this.eventType === 'tooltip_dismissed') && 
            !payload.tooltip_id) {
          return false;
        }
        return true;
      },
      message: 'Payload validation failed for event type'
    }
  },
  deviceInfo: { 
    type: Schema.Types.Mixed, 
    required: true 
  }
});

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);