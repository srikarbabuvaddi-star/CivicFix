import mongoose from 'mongoose';
import { VALID_ISSUE_CATEGORIES } from '../../config/constants.js';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      minlength: [2, 'Department name must be at least 2 characters long'],
      maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    categoriesHandled: {
      type: [String],
      required: [true, 'At least one handled category is required'],
      validate: {
        validator: function (categories) {
          if (!Array.isArray(categories) || categories.length === 0) return false;
          return categories.every((cat) => VALID_ISSUE_CATEGORIES.includes(cat));
        },
        message: `Categories must be non-empty and contain valid categories: ${VALID_ISSUE_CATEGORIES.join(', ')}`
      }
    },
    serviceArea: {
      type: String,
      trim: true,
      maxlength: [150, 'Service area cannot exceed 150 characters'],
      default: 'Municipality-Wide'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

export const Department = mongoose.model('Department', departmentSchema);
