import { Schema, model, Document } from 'mongoose';

export interface ITokenBlacklist extends Document {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);

