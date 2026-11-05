import mongoose from 'mongoose';
import { VALID_ROLES, ROLES, VALID_ACCOUNT_STATUSES, ACCOUNT_STATUS } from '../../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Do not include in queries by default
    },
    role: {
      type: String,
      enum: {
        values: VALID_ROLES,
        message: 'Role `{VALUE}` is not supported'
      },
      default: ROLES.CITIZEN,
      required: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    status: {
      type: String,
      enum: {
        values: VALID_ACCOUNT_STATUSES,
        message: 'Status `{VALUE}` is not supported'
      },
      default: ACCOUNT_STATUS.ACTIVE,
      required: true
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      inApp: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        ret.fullName = ret.name;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

userSchema.virtual('fullName').get(function () {
  return this.name;
});

export const User = mongoose.model('User', userSchema);
