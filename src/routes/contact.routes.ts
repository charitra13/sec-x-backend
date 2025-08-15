import express from 'express';
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactAnalytics
} from '../controllers/contact.controller';
import { createContactValidation, updateContactValidation } from '../validators/contact.validator';
import { protect } from '../middleware/auth.middleware';
import { contactSubmissionLimiter, contactApiLimiter } from '../middleware/contactRateLimit';

const router = express.Router();

// Public route - Create contact submission (with strict rate limiting)
router.post('/', contactSubmissionLimiter, createContactValidation, createContact);

// Protected routes - Admin only (with general API rate limiting)
router.use(contactApiLimiter);
router.use(protect); // All routes below require authentication

// Get all contacts with filtering and pagination
router.get('/', getContacts);

// Get contact analytics
router.get('/analytics', getContactAnalytics);

// Get single contact by ID
router.get('/:id', getContactById);

// Update contact
router.put('/:id', updateContactValidation, updateContact);

// Delete contact
router.delete('/:id', deleteContact);

export default router;
