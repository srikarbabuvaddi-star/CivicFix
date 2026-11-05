import mongoose from 'mongoose';
import { VALID_RESOLUTION_QUALITIES, RESOLUTION_QUALITY } from '../../config/constants.js';

const feedbackSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'Issue reference is required'],
      unique: true // Exactly one feedback record per issue
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5'
      }
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: ''
    },
    resolutionQuality: {
      type: String,
      enum: {
        values: VALID_RESOLUTION_QUALITIES,
        message: 'Resolution quality `{VALUE}` is not supported'
      },
      default: RESOLUTION_QUALITY.GOOD
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

feedbackSchema.index({ citizenId: 1, createdAt: -1 });

export const Feedback = mongoose.model('Feedback', feedbackSchema);

