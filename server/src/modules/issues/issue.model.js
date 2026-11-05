import mongoose from 'mongoose';
import {
  VALID_ISSUE_CATEGORIES,
  ISSUE_CATEGORIES,
  VALID_ISSUE_STATUSES,
  ISSUE_STATUS,
  VALID_ISSUE_PRIORITIES,
  ISSUE_PRIORITY,
  VALID_ISSUE_VISIBILITIES,
  ISSUE_VISIBILITY
} from '../../config/constants.js';

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates [longitude, latitude] are required'],
      validate: {
        validator: function (val) {
          if (!Array.isArray(val) || val.length !== 2) return false;
          const [lng, lat] = val;
          return (
            typeof lng === 'number' &&
            !isNaN(lng) &&
            typeof lat === 'number' &&
            !isNaN(lat) &&
            lng >= -180 &&
            lng <= 180 &&
            lat >= -90 &&
            lat <= 90
          );
        },
        message: 'Coordinates must be valid numbers [longitude (-180 to 180), latitude (-90 to 90)]'
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
      default: ''
    }
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    issueNumber: {
      type: String,
      required: [true, 'Issue number is required'],
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: VALID_ISSUE_CATEGORIES,
        message: 'Category `{VALUE}` is not supported'
      },
      default: ISSUE_CATEGORIES.OTHER
    },
    location: {
      type: pointSchema,
      required: [true, 'Location is required']
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required']
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: VALID_ISSUE_STATUSES,
        message: 'Status `{VALUE}` is not supported'
      },
      default: ISSUE_STATUS.SUBMITTED
    },
    priority: {
      type: String,
      required: true,
      enum: {
        values: VALID_ISSUE_PRIORITIES,
        message: 'Priority `{VALUE}` is not supported'
      },
      default: ISSUE_PRIORITY.NORMAL
    },
    visibility: {
      type: String,
      required: true,
      enum: {
        values: VALID_ISSUE_VISIBILITIES,
        message: 'Visibility `{VALUE}` is not supported'
      },
      default: ISSUE_VISIBILITY.PUBLIC
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Resolution notes cannot exceed 2000 characters'],
      default: null
    },
    evidenceNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Evidence notes cannot exceed 1000 characters'],
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    },
    reopenedReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for query performance and constraints
issueSchema.index({ reporterId: 1, updatedAt: -1 });
issueSchema.index({ assigneeId: 1, status: 1 });
issueSchema.index({ departmentId: 1, status: 1 });
issueSchema.index({ status: 1, category: 1, createdAt: -1 });
issueSchema.index({ visibility: 1, status: 1, createdAt: -1 });
issueSchema.index({ location: '2dsphere' });

export const Issue = mongoose.model('Issue', issueSchema);

