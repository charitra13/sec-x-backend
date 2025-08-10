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

