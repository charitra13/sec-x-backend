# Phase 1: Backend Implementation Guide for SecurityX Blog

## Overview
This guide provides step-by-step instructions to enhance the existing auth backend to support the SecurityX blog application. We'll build upon the current TypeScript Express authentication system.

## Current State Analysis

### ✅ What's Already Implemented
- Express TypeScript server with MongoDB
- User authentication (register/login)
- JWT token management
- Password hashing with bcrypt
- Zod validation
- Error handling middleware
- CORS configuration
- Basic user model

### 🔧 What Needs to be Added
- Enhanced user roles (admin/reader)
- Blog model and CRUD operations
- Image upload functionality
- Role-based authorization
- Advanced API endpoints
- Database optimization

## Step-by-Step Implementation

### 1. Update Dependencies

First, update the package.json to include new dependencies:

```bash
# Navigate to your auth backend directory
cd "/Users/charitra/Developer/Vibe Coding/auth-app/backend"

# Install additional dependencies
npm install multer cloudinary express-rate-limit helmet morgan compression slugify express-validator
npm install --save-dev @types/multer @types/compression
```

### 2. Enhanced User Model with Roles

Update `src/models/User.model.ts`:

```typescript
import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'reader';
  avatar?: string;
  bio?: string;
  newsletter: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['reader', 'admin'],
      default: 'reader'
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [200, 'Bio cannot exceed 200 characters']
    },
    newsletter: {
      type: Boolean,
      default: false
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for user's blogs
userSchema.virtual('blogs', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'author'
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(password, this.password);
};

const User = model<IUser>('User', userSchema);
export default User;
```

### 3. Create Blog Model

Create `src/models/Blog.model.ts`:

```typescript
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
      required: true,
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
blogSchema.virtual('commentsCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'blog',
  count: true
});

// Generate slug from title
blogSchema.pre<IBlog>('save', function (next) {
  if (this.isModified('title')) {
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
blogSchema.index({ slug: 1 });
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

const Blog = model<IBlog>('Blog', blogSchema);
export default Blog;
```

### 4. Enhanced Authentication Middleware

Update `src/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import User from '../models/User.model';

export interface IAuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const protect = async (req: IAuthRequest, _res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('Not authorized to access this route'));
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new UnauthorizedError('User not found'));
    }

    if (!user.isActive) {
      return next(new UnauthorizedError('User account is deactivated'));
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    return next(new UnauthorizedError('Not authorized, token failed'));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: IAuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('User role not authorized to access this route'));
    }

    next();
  };
};
```

### 5. Blog Controller

Create `src/controllers/blog.controller.ts`:

```typescript
import { Response, NextFunction } from 'express';
import Blog from '../models/Blog.model';
import { IAuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

export const createBlog = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const blogData = {
      ...req.body,
      author: req.user?.id
    };

    const blog = await Blog.create(blogData);
    await blog.populate('author', 'name email');

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBlogs = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build query filters
    const query: any = {};
    
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      // Non-admin users can only see published blogs
      if (req.user?.role !== 'admin') {
        query.status = 'published';
      }
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.tags) {
      query.tags = { $in: (req.query.tags as string).split(',') };
    }

    if (req.query.author) {
      query.author = req.query.author;
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Sort options
    let sortBy = '-createdAt';
    if (req.query.sort) {
      sortBy = req.query.sort as string;
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name email avatar')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getBlogBySlug = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('author', 'name email avatar bio');

    if (!blog) {
      throw new NotFoundError('Blog not found');
    }

    // Check if user can view unpublished blogs
    if (blog.status === 'draft' && req.user?.role !== 'admin' && 
        blog.author._id.toString() !== req.user?.id) {
      throw new NotFoundError('Blog not found');
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    next(error);
  }
};

export const updateBlog = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      throw new NotFoundError('Blog not found');
    }

    // Check if user can update this blog
    if (req.user?.role !== 'admin' && blog.author.toString() !== req.user?.id) {
      throw new ForbiddenError('Not authorized to update this blog');
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'name email avatar');

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: updatedBlog
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBlog = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      throw new NotFoundError('Blog not found');
    }

    // Check if user can delete this blog
    if (req.user?.role !== 'admin' && blog.author.toString() !== req.user?.id) {
      throw new ForbiddenError('Not authorized to delete this blog');
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const likeBlog = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      throw new NotFoundError('Blog not found');
    }

    const userId = req.user?.id;
    const hasLiked = blog.likes.includes(userId as any);

    if (hasLiked) {
      // Unlike
      blog.likes = blog.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      blog.likes.push(userId as any);
    }

    await blog.save();

    res.json({
      success: true,
      message: hasLiked ? 'Blog unliked' : 'Blog liked',
      data: {
        likes: blog.likes.length,
        hasLiked: !hasLiked
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBlogs = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { author: req.user?.id };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const blogs = await Blog.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
```

### 6. Blog Validators

Create `src/validators/blog.validator.ts`:

```typescript
import { z } from 'zod';

export const createBlogSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: 'Title is required',
      })
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title cannot exceed 200 characters'),
    excerpt: z
      .string({
        required_error: 'Excerpt is required',
      })
      .min(10, 'Excerpt must be at least 10 characters')
      .max(300, 'Excerpt cannot exceed 300 characters'),
    content: z
      .string({
        required_error: 'Content is required',
      })
      .min(50, 'Content must be at least 50 characters'),
    category: z
      .enum(['AI Security', 'Red Teaming', 'Penetration Testing', 'Security Architecture', 'Cybersecurity'], {
        required_error: 'Category is required',
      }),
    tags: z
      .array(z.string())
      .min(1, 'At least one tag is required')
      .max(10, 'Maximum 10 tags allowed'),
    status: z
      .enum(['draft', 'published'])
      .optional()
      .default('draft'),
    coverImage: z
      .string({
        required_error: 'Cover image is required',
      })
      .url('Cover image must be a valid URL'),
    seo: z.object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      metaKeywords: z.array(z.string()).max(10).optional()
    }).optional()
  })
});

export const updateBlogSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),
    excerpt: z
      .string()
      .min(10, 'Excerpt must be at least 10 characters')
      .max(300, 'Excerpt cannot exceed 300 characters')
      .optional(),
    content: z
      .string()
      .min(50, 'Content must be at least 50 characters')
      .optional(),
    category: z
      .enum(['AI Security', 'Red Teaming', 'Penetration Testing', 'Security Architecture', 'Cybersecurity'])
      .optional(),
    tags: z
      .array(z.string())
      .min(1, 'At least one tag is required')
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    status: z
      .enum(['draft', 'published'])
      .optional(),
    coverImage: z
      .string()
      .url('Cover image must be a valid URL')
      .optional(),
    seo: z.object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      metaKeywords: z.array(z.string()).max(10).optional()
    }).optional()
  })
});
```

### 7. Blog Routes

Create `src/routes/blog.routes.ts`:

```typescript
import { Router } from 'express';
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  likeBlog,
  getMyBlogs
} from '../controllers/blog.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createBlogSchema, updateBlogSchema } from '../validators/blog.validator';

const router = Router();

// Public routes
router.get('/', getAllBlogs);
router.get('/slug/:slug', getBlogBySlug);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/my-blogs', getMyBlogs);
router.post('/:id/like', likeBlog);

// Admin/Author routes
router.post('/', authorize('admin'), validate(createBlogSchema), createBlog);
router.put('/:id', authorize('admin'), validate(updateBlogSchema), updateBlog);
router.delete('/:id', authorize('admin'), deleteBlog);

export default router;
```

### 8. Image Upload Utility

Create `src/utils/imageUpload.ts`:

```typescript
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'securityx-blog',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 630, crop: 'fill' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  } as any,
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Upload controller
export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: req.file.path,
        publicId: (req.file as any).filename
      }
    });
  } catch (error) {
    next(error);
  }
};
```

### 9. Rate Limiting Middleware

Create `src/middleware/rateLimiter.ts`:

```typescript
import rateLimit from 'express-rate-limit';

export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

export const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests, please try again later'
);

export const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  'Too many upload attempts, please try again later'
);
```

### 10. Update Error Utilities

Update `src/utils/errors.ts`:

```typescript
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Error') {
    super(message, 422);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}
```

### 11. Update Main Server File

Update `src/index.ts`:

```typescript
import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import blogRoutes from './routes/blog.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './utils/errors';
import { generalLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGODB_URI;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'SecurityX Backend API is running!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Handle 404 Not Found errors
app.use((_req: Request, _res: Response, next) => {
  next(new NotFoundError(`The requested URL ${_req.originalUrl} was not found on this server.`));
});

// Global error handler
app.use(errorHandler);

// Connect to MongoDB and start the server
const startServer = async () => {
  if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Successfully connected to MongoDB!');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

startServer();

export default app;
```

### 12. Environment Variables

Update `.env.example`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/securityx-blog

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-complex
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=8080
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration (for future use)
EMAIL_FROM=noreply@securityx.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 13. Database Seeding (Optional)

Create `src/scripts/seed.ts`:

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model';
import Blog from '../models/Blog.model';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    // Clear existing data
    await User.deleteMany({});
    await Blog.deleteMany({});
    
    // Create admin user
    const adminUser = await User.create({
      name: 'SecurityX Admin',
      email: 'admin@securityx.com',
      password: 'Admin123!',
      role: 'admin',
      isEmailVerified: true
    });
    
    // Create sample blogs
    const sampleBlogs = [
      {
        title: 'Getting Started with AI Security',
        excerpt: 'Learn the fundamentals of AI security and how to protect your AI systems.',
        content: 'This is a comprehensive guide to AI security...',
        category: 'AI Security',
        tags: ['AI', 'Security', 'Machine Learning'],
        status: 'published',
        author: adminUser._id,
        coverImage: 'https://via.placeholder.com/1200x630/1a1a1a/ffffff?text=AI+Security'
      },
      // Add more sample blogs as needed
    ];
    
    await Blog.insertMany(sampleBlogs);
    
    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
```

## Testing the Implementation

### 1. Test Authentication
```bash
# Register a new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### 2. Test Blog Operations
```bash
# Get all blogs (public)
curl http://localhost:8080/api/blogs

# Create a blog (admin only)
curl -X POST http://localhost:8080/api/blogs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Blog Post",
    "excerpt": "This is a test blog post excerpt.",
    "content": "This is the full content of the test blog post...",
    "category": "Cybersecurity",
    "tags": ["test", "security"],
    "coverImage": "https://via.placeholder.com/1200x630"
  }'
```

## Next Steps

After implementing Phase 1, you should have:
- ✅ Enhanced user authentication with roles
- ✅ Complete blog CRUD operations
- ✅ Role-based authorization
- ✅ Image upload functionality
- ✅ Proper validation and error handling
- ✅ Rate limiting and security features

**Phase 2 Preview**: The next phase will include comment system, analytics, and advanced features like real-time notifications and email integration.

## Troubleshooting

### Common Issues:
1. **MongoDB Connection**: Ensure MongoDB is running and connection string is correct
2. **JWT Errors**: Verify JWT_SECRET is set and consistent
3. **Cloudinary Upload**: Check Cloudinary credentials are correct
4. **CORS Issues**: Ensure FRONTEND_URL matches your frontend domain
5. **Rate Limiting**: Adjust rate limits if needed during development

### Development Tips:
- Use Postman or similar tools for API testing
- Enable detailed error logging in development
- Use MongoDB Compass for database inspection
- Monitor server logs for any issues