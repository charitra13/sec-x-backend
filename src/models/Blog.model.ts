import { Schema, model, Document, Types } from 'mongoose';
import slugify from 'slugify';

export interface IBlog extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: Types.ObjectId;
  category: string;
  tags: string[];
  status: 'draft' | 'published';
  readingTime: number;
  views: number;
  likes: Types.ObjectId[];
  shares: {
    total: number;
    twitter: number;
    facebook: number;
    linkedin: number;
    whatsapp: number;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
  };
  publishedAt?: Date;
  isFeature: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      maxlength: [300, 'Excerpt cannot exceed 300 characters']
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    coverImage: {
      type: String,
      required: [true, 'Cover image is required']
    },
    author: {
      type: Schema.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['AI Security', 'Red Teaming', 'Penetration Testing', 'Security Architecture', 'Cybersecurity']
    },
    tags: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft'
    },
    readingTime: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    likes: [{
      type: Schema.ObjectId,
      ref: 'User'
    }],
    shares: {
      total: { type: Number, default: 0 },
      twitter: { type: Number, default: 0 },
      facebook: { type: Number, default: 0 },
      linkedin: { type: Number, default: 0 },
      whatsapp: { type: Number, default: 0 }
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: [String]
    },
    publishedAt: Date,
    isFeature: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for comments count
blogSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'blog',
});

blogSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'blog',
  count: true
});

// Generate slug from title
blogSchema.pre<IBlog>('save', function (next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  
  // Calculate reading time (average 200 words per minute)
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(' ').length;
    this.readingTime = Math.ceil(wordCount / wordsPerMinute);
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Indexes
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

const Blog = model<IBlog>('Blog', blogSchema);
export default Blog; 