import { Schema, model, Document, Types } from 'mongoose';

export interface IComment extends Document {
  _id: Types.ObjectId;
  text: string;
  author: Types.ObjectId;
  blog: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const commentSchema = new Schema<IComment>(
  {
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    author: {
      type: Schema.ObjectId,
      ref: 'User',
      required: true
    },
    blog: {
      type: Schema.ObjectId,
      ref: 'Blog',
      required: true
    }
  },
  {
    timestamps: true
  }
);

commentSchema.index({ blog: 1, createdAt: -1 });

const Comment = model<IComment>('Comment', commentSchema);
export default Comment; 