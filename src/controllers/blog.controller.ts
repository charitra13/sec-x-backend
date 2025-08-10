import { Response, NextFunction, Request, Router } from 'express';
import Blog from '../models/Blog.model';
import slugify from 'slugify';
import { IAuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

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
      // Handle special 'all' status for admins
      if (req.query.status === 'all' && req.user?.role === 'admin') {
        // Don't add status filter - show all blogs regardless of status
      } else if (req.query.status === 'all') {
        // Non-admin users requesting 'all' should only see published
        query.status = 'published';
      } else {
        // Specific status requested
        query.status = req.query.status;
      }
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

    // Sort options with support for "popular" alias
    let sortBy = '-createdAt';
    if (req.query.sort) {
      const sortParam = (req.query.sort as string).toString();
      if (sortParam === 'popular') {
        // Popularity heuristic: views desc, likes count desc, createdAt desc
        sortBy = '-views -likes -createdAt';
      } else {
        sortBy = sortParam;
      }
    }

    const blogs = await Blog.find(query)
      .populate({
        path: 'author',
        select: 'name email avatar',
        // Handle missing authors gracefully
        options: {
          lean: true,
          // If author doesn't exist, don't include the blog or set default
          strictPopulate: false
        } as any
      })
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    // Filter out blogs with invalid author references
    const validBlogs = blogs.filter((blog: any) => blog.author && (blog.author as any)._id);

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: {
        blogs: validBlogs,
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

// @desc    Search blogs by keyword
// @route   GET /api/blogs/search
// @access  Public
export const searchBlogs = asyncHandler(async (req: Request, res: Response) => {
  const keyword = req.query.keyword
    ? {
        title: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};
  const blogs = await Blog.find({ ...keyword, status: 'published' });
  res.json({ blogs });
});

export default router; 

export const validateAndFixBlogs = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only admins can run this operation
    if (req.user?.role !== 'admin') {
      throw new ForbiddenError('Only admins can run blog validation');
    }

    const blogs = await Blog.find({});
    const fixedBlogs: Array<{ id: any; title: string; fixes: string[] }> = [];

    for (const blog of blogs) {
      let needsSave = false;
      const updates: any = {};

      // Fix missing slug
      if (!blog.slug && blog.title) {
        updates.slug = slugify(blog.title, { lower: true, strict: true });
        needsSave = true;
      }

      // Fix missing readingTime
      if ((!blog.readingTime || blog.readingTime === 0) && blog.content) {
        const wordsPerMinute = 200;
        const wordCount = blog.content.split(' ').length;
        updates.readingTime = Math.ceil(wordCount / wordsPerMinute);
        needsSave = true;
      }

      // Fix missing publishedAt for published blogs
      if (blog.status === 'published' && !blog.publishedAt) {
        updates.publishedAt = (blog as any).createdAt || new Date();
        needsSave = true;
      }

      // Fix missing shares object
      if (!blog.shares || typeof blog.shares !== 'object') {
        updates.shares = {
          total: 0,
          twitter: 0,
          facebook: 0,
          linkedin: 0,
          whatsapp: 0
        };
        needsSave = true;
      }

      // Fix missing default values
      if ((blog as any).views === undefined) {
        updates.views = 0;
        needsSave = true;
      }

      if ((blog as any).isFeature === undefined) {
        updates.isFeature = false;
        needsSave = true;
      }

      if (!blog.likes) {
        updates.likes = [];
        needsSave = true;
      }

      if (needsSave) {
        await Blog.findByIdAndUpdate(blog._id, updates, {
          new: true,
          runValidators: true
        });
        fixedBlogs.push({
          id: blog._id,
          title: blog.title,
          fixes: Object.keys(updates)
        });
      }
    }

    res.json({
      success: true,
      message: `Validated ${blogs.length} blogs, fixed ${fixedBlogs.length} blogs`,
      data: {
        totalBlogs: blogs.length,
        fixedBlogs: fixedBlogs.length,
        fixes: fixedBlogs
      }
    });
  } catch (error) {
    next(error);
  }
};