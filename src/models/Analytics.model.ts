import { Schema, model, Document, Types } from 'mongoose';

export interface IAnalytics extends Document {
  post: Types.ObjectId;
  views: number;
  shares: number;
  date: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>({
  post: {
    type: Schema.Types.ObjectId,
    ref: 'Blog',
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    required: true,
  },
});

AnalyticsSchema.index({ post: 1, date: 1 }, { unique: true });

const Analytics = model<IAnalytics>('Analytics', AnalyticsSchema);

export default Analytics; 