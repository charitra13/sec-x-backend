import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  _id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  countryCode: string;
  serviceType?: string;
  message: string;
  formType: 'contact' | 'assessment';
  status: 'new' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
}

const ContactSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
      maxlength: [255, 'Email cannot exceed 255 characters']
    },
    company: {
      type: String,
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      trim: true,
      maxlength: [5, 'Country code cannot exceed 5 characters']
    },
    serviceType: {
      type: String,
      enum: ['red-teaming', 'penetration-testing', 'ai-security', 'compliance-audit', 'incident-response', 'security-training', 'other'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      minlength: [10, 'Message must be at least 10 characters']
    },
    formType: {
      type: String,
      enum: ['contact', 'assessment'],
      default: 'contact',
      required: true
    },
    status: {
      type: String,
      enum: ['new', 'in-progress', 'resolved', 'closed'],
      default: 'new',
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      required: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      trim: true,
      default: 'website'
    },
    lastContactedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
ContactSchema.index({ email: 1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ createdAt: -1 });
ContactSchema.index({ formType: 1 });
ContactSchema.index({ priority: 1 });

// Virtual for formatted phone number
ContactSchema.virtual('formattedPhone').get(function() {
  if (!this.phone) return '';
  return `${this.countryCode} ${this.phone}`;
});

// Pre-save middleware to set priority based on service type
ContactSchema.pre('save', function(next) {
  if (this.isNew) {
    // Auto-assign higher priority for certain service types
    if (this.serviceType === 'incident-response') {
      this.priority = 'urgent';
    } else if (this.serviceType === 'red-teaming' || this.serviceType === 'penetration-testing') {
      this.priority = 'high';
    }
  }
  next();
});

const Contact = mongoose.model<IContact>('Contact', ContactSchema);
export default Contact;
