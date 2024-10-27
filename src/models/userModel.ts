import mongoose, { Document, Schema } from 'mongoose';
import argon2 from 'argon2';

export interface IUser extends Document {
  username: string;
  email?: string;
  password?: string;
  vkId?: string;
  googleId?: string;
  avatar?: string;
  description?: string; // Поле для описания
  createdAt: Date;
  roles: string[];
  wishlist: string[];
  perfumeCollection: string[];
  isActivated: boolean;
  activationCode: string;
  isValidPassword(password: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema({
  username: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
  },
  roles: {
    type: [String],
    default: ['user'],
  },
  vkId: {
    type: String,
    unique: true,
    sparse: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  avatar: {
    type: String,
  },
  description: {
    type: String,
    default: '', // По умолчанию пустое описание
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  wishlist: {
    type: [String],
    default: [],
  },
  perfumeCollection: {
    type: [String],
    default: [],
  },
  isActivated: {
    type: Boolean,
    default: false,
  },
  activationCode: {
    type: String,
  },
});

export default mongoose.model<IUser>('User', UserSchema);
