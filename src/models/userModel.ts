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
  isVerified: boolean;
  website?: string; // Additional field for a website URL
  vkUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  pinterestUrl?: string;
  telegramUrl?: string;
  resetPasswordToken?: string; // Токен для сброса пароля
  resetPasswordExpires?: Date; // Срок действия токена сброса пароля
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
    default: '', // Default empty description
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
  isVerified: {
    type: Boolean,
    default: false,
  },
  // Social media and website fields
  website: {
    type: String,
    default: null,
  },
  vkUrl: {
    type: String,
    default: null,
  },
  instagramUrl: {
    type: String,
    default: null,
  },
  youtubeUrl: {
    type: String,
    default: null,
  },
  pinterestUrl: {
    type: String,
    default: null,
  },
  telegramUrl: {
    type: String,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
});

// Adding password verification logic
UserSchema.methods.isValidPassword = async function (password: string): Promise<boolean> {
  return await argon2.verify(this.password, password);
};

export default mongoose.model<IUser>('User', UserSchema);
