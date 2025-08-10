# Backend Cloudinary Integration Implementation Guide

## Mission: Enable Cloudinary Image Upload API Endpoints

**Target**: Make the existing Cloudinary utilities functional by adding environment configuration and API routes.

## Files to Modify/Create

### 1. Environment Configuration
**File**: `.env`
**Action**: ADD the following Cloudinary variables

```env
# ADD THESE CLOUDINARY VARIABLES TO EXISTING .env:
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Note**: User must replace with actual Cloudinary credentials from their dashboard.

### 2. Create Upload Routes File
**File**: `src/routes/upload.routes.ts` (NEW FILE)
**Action**: CREATE this complete file

```typescript
import { Router } from 'express';
import { upload, uploadImage } from '../utils/imageUpload';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Single image upload endpoint
// POST /api/upload
// Requires: Authentication + Admin role + multipart file with field name 'image'
router.post('/', protect, authorize('admin'), upload.single('image'), uploadImage);

// Multiple image upload endpoint (for future use)
// POST /api/upload/multiple  
// Requires: Authentication + Admin role + multipart files with field name 'images'
router.post('/multiple', protect, authorize('admin'), upload.array('images', 5), (req, res, next) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files uploaded'
      });
    }

    const files = req.files as Express.Multer.File[];
    const urls = files.map(file => ({
      url: file.path,
      publicId: (file as any).filename
    }));

    return res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: urls
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
```

### 3. Register Routes in Main Application
**File**: `src/index.ts`
**Action**: MODIFY existing file in two places

#### 3a. Add Import Statement
**Location**: Top of file with other route imports (around line 15)
**Find**: The existing import block
```typescript
// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import blogRoutes from './routes/blog.routes';
// ... other imports
```

**Add**: This line to the import block
```typescript
import uploadRoutes from './routes/upload.routes'; // ADD THIS LINE
```

#### 3b. Register the Route
**Location**: API Routes section (around line 65)
**Find**: The existing API routes block
```typescript
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);
```

**Add**: This line in the routes block
```typescript
app.use('/api/upload', uploadRoutes); // ADD THIS LINE
```

**Final API Routes section should look like**:
```typescript
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes); // NEW LINE
app.use('/api/cors-debug', corsDebugRoutes);
app.use('/api/admin/origins', originManagementRoutes);
app.use('/api/cors', corsDocumentationRoutes);
```

## Testing and Validation

### 1. Create Test Script (Optional)
**File**: `test-cloudinary.js` (NEW FILE - Root directory)
```javascript
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testConnection() {
  try {
    console.log('Testing Cloudinary connection...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'NOT SET');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'NOT SET');
    
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful!', result);
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
  }
}

testConnection();
```

**Run**: `node test-cloudinary.js`

### 2. Start Development Server
```bash
npm run dev
```

**Expected Output**:
- No TypeScript compilation errors
- Server starts successfully
- New route `/api/upload` available

## API Endpoint Documentation

### POST /api/upload
**Purpose**: Upload single image to Cloudinary
**Authentication**: Required (Admin role)
**Content-Type**: multipart/form-data
**Body**: File with field name 'image'

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/securityx-blog/filename.jpg",
    "publicId": "securityx-blog/filename"
  }
}
```

**Response Error (400)**:
```json
{
  "success": false,
  "message": "No image file uploaded"
}
```

### Image Optimization (Automatic)
- **Resize**: 1200x630 pixels (crop: fill)
- **Quality**: Auto optimization
- **Format**: Auto (WebP when supported)
- **Folder**: securityx-blog/
- **Size Limit**: 5MB
- **Allowed Formats**: jpg, jpeg, png, gif, webp

## Production Deployment

### Environment Variables for Render
Add these to Render dashboard:
```
CLOUDINARY_CLOUD_NAME=your_production_cloud_name
CLOUDINARY_API_KEY=your_production_api_key  
CLOUDINARY_API_SECRET=your_production_api_secret
```

## Verification Checklist
- [ ] Environment variables added to .env
- [ ] upload.routes.ts file created with correct content
- [ ] Import added to index.ts
- [ ] Route registered in index.ts API section
- [ ] Server starts without TypeScript errors
- [ ] Test script runs successfully (if created)
- [ ] Upload endpoint responds to POST requests

## Common Issues
1. **"Invalid credentials"**: Check environment variables are set correctly
2. **"Route not found"**: Verify route registration in index.ts
3. **"Unauthorized"**: Ensure user has admin role and valid JWT token
4. **"No file uploaded"**: Check frontend sends file with field name 'image'

## Integration Notes
- Existing `imageUpload.ts` utility handles all Cloudinary logic
- Blog model already supports `coverImage` URL field
- Frontend will automatically work once these backend changes are deployed
- No database migrations required