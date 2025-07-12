import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slugify from 'slugify';
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
    
    for (const blogData of sampleBlogs) {
      const blog = new Blog({
        ...blogData,
        slug: slugify(blogData.title, { lower: true, strict: true })
      });
      await blog.save();
    }
    
    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData(); 