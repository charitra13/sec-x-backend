import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Contact from '../models/Contact.model';
import { BadRequestError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

// Create a new contact submission
export const createContact = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError('Validation failed');
    }

    const {
      name,
      email,
      company,
      phone,
      countryCode,
      serviceType,
      message,
      formType
    } = req.body;

    // Extract additional metadata
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const contactData = {
      name,
      email,
      company,
      phone,
      countryCode,
      serviceType,
      message,
      formType: formType || 'contact',
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
      source: 'website'
    };

    const contact = new Contact(contactData);
    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact submission received successfully',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        formType: contact.formType,
        status: contact.status,
        createdAt: contact.createdAt
      }
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      throw new BadRequestError('Contact validation failed');
    }
    throw error;
  }
};

// Get all contacts with filtering, sorting, and pagination
export const getContacts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    if (req.query.formType && req.query.formType !== 'all') {
      filter.formType = req.query.formType;
    }
    
    if (req.query.priority && req.query.priority !== 'all') {
      filter.priority = req.query.priority;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { message: searchRegex }
      ];
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Sort options
    let sortOption: any = { createdAt: -1 }; // Default: newest first
    if (req.query.sortBy) {
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sortOption = { [sortBy]: sortOrder };
    }

    // Execute queries
    const [contacts, totalContacts] = await Promise.all([
      Contact.find(filter)
        .populate('assignedTo', 'name email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Contact.countDocuments(filter)
    ]);

    // Calculate statistics
    const stats = await Contact.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          newCount: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          inProgressCount: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          contactFormCount: { $sum: { $cond: [{ $eq: ['$formType', 'contact'] }, 1, 0] } },
          assessmentFormCount: { $sum: { $cond: [{ $eq: ['$formType', 'assessment'] }, 1, 0] } }
        }
      }
    ]);

    const totalPages = Math.ceil(totalContacts / limit);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          currentPage: page,
          totalPages,
          totalContacts,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        stats: stats[0] || {
          total: 0,
          newCount: 0,
          inProgressCount: 0,
          resolvedCount: 0,
          urgentCount: 0,
          contactFormCount: 0,
          assessmentFormCount: 0
        }
      }
    });
  } catch (error) {
    throw error;
  }
};

// Get a single contact by ID
export const getContactById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid contact ID');
    }

    const contact = await Contact.findById(id).populate('assignedTo', 'name email');

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    res.json({
      success: true,
      data: { contact }
    });
  } catch (error) {
    throw error;
  }
};

// Update contact status and other fields
export const updateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid contact ID');
    }

    // Remove fields that shouldn't be updated via this endpoint
    delete updates._id;
    delete updates.createdAt;
    delete updates.ipAddress;
    delete updates.userAgent;

    // If status is being updated to 'resolved' or 'closed', set lastContactedAt
    if ((updates.status === 'resolved' || updates.status === 'closed') && updates.status !== undefined) {
      updates.lastContactedAt = new Date();
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: { contact }
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      throw new BadRequestError('Contact update validation failed');
    }
    throw error;
  }
};

// Delete a contact
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid contact ID');
    }

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    throw error;
  }
};

// Get contact analytics
export const getContactAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await Contact.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            formType: '$formType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          contact: {
            $sum: { $cond: [{ $eq: ['$_id.formType', 'contact'] }, '$count', 0] }
          },
          assessment: {
            $sum: { $cond: [{ $eq: ['$_id.formType', 'assessment'] }, '$count', 0] }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get status distribution
    const statusDistribution = await Contact.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get service type distribution for assessment forms
    const serviceTypeDistribution = await Contact.aggregate([
      {
        $match: {
          formType: 'assessment',
          createdAt: { $gte: startDate },
          serviceType: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        dailySubmissions: analytics,
        statusDistribution,
        serviceTypeDistribution,
        period: `${days} days`
      }
    });
  } catch (error) {
    throw error;
  }
};
