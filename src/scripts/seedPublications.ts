import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Blog from '../models/Blog.model';
import User from '../models/User.model';
import { IBlog } from '../models/Blog.model';

const MONGODB_URI = process.env.MONGODB_URI;

const categoryMapping: { [key: string]: IBlog['category'] } = {
  'Architecture': 'Security Architecture',
  'Threat Intelligence': 'Red Teaming',
  'Cloud Security': 'Security Architecture',
  'AI Security': 'AI Security',
  'Incident Response': 'Cybersecurity',
  'Risk Management': 'Cybersecurity',
};

const seedPublications = async () => {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully.');

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found. Please ensure at least one admin exists.');
    }
    console.log(`Found admin user: ${adminUser.name}`);

    const publicationsPath = path.join(__dirname, '../../../frontend/lib/publications.json');
    const publicationsData = JSON.parse(fs.readFileSync(publicationsPath, 'utf-8'));

    console.log(`Found ${publicationsData.length} publications to process.`);
    let blogsCreated = 0;

    for (const pub of publicationsData) {
      const existingBlog = await Blog.findOne({ title: pub.title });

      if (existingBlog) {
        console.log(`Blog "${pub.title}" already exists. Skipping.`);
        continue;
      }
      
      const { introduction, sections, keyTakeaways, conclusion } = pub.content;
      
      const formattedContent = [
        introduction,
        ...sections.map((section: any) => `## ${section.title}\n\n${section.content}`),
        '## Key Takeaways',
        ...keyTakeaways.map((item: string) => `* ${item}`),
        '## Conclusion',
        conclusion,
      ].join('\n\n');

      const mappedCategory = categoryMapping[pub.category];
      if (!mappedCategory) {
        console.warn(`Warning: No mapping found for category "${pub.category}" in publication "${pub.title}". Skipping.`);
        continue;
      }

      const newBlogData = {
        title: pub.title,
        excerpt: pub.description,
        content: formattedContent,
        coverImage: 'https://via.placeholder.com/1200x630.png?text=SEC-X+Blog',
        author: adminUser._id,
        category: mappedCategory,
        tags: [pub.type],
        status: 'published' as 'published' | 'draft',
      };

      const newBlog = new Blog(newBlogData);
      await newBlog.save();
      blogsCreated++;
      console.log(`Successfully created blog: "${pub.title}"`);
    }

    console.log('\nSeeding complete.');
    console.log(`Total blogs created: ${blogsCreated}`);

  } catch (error) {
    console.error('An error occurred during the seeding process:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

seedPublications(); 