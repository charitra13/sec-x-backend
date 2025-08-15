import { body } from 'express-validator';

export const createContactValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),
  
  body('company')
    .optional()
    .isLength({ max: 150 })
    .withMessage('Company name cannot exceed 150 characters')
    .trim(),
  
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters')
    .trim(),
  
  body('countryCode')
    .notEmpty()
    .withMessage('Country code is required')
    .isLength({ max: 5 })
    .withMessage('Country code cannot exceed 5 characters')
    .trim(),
  
  body('serviceType')
    .optional()
    .isIn(['red-teaming', 'penetration-testing', 'ai-security', 'compliance-audit', 'incident-response', 'security-training', 'other'])
    .withMessage('Please select a valid service type'),
  
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
    .trim(),
  
  body('formType')
    .optional()
    .isIn(['contact', 'assessment'])
    .withMessage('Form type must be either contact or assessment')
];

export const updateContactValidation = [
  body('status')
    .optional()
    .isIn(['new', 'in-progress', 'resolved', 'closed'])
    .withMessage('Status must be one of: new, in-progress, resolved, closed'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
    .trim(),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Assigned to must be a valid user ID')
];
