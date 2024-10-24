import mongoose, { Document, Schema } from 'mongoose';
import argon2 from 'argon2';

export interface IUser extends Document {
  username: string;
  email?: string;
  password?: string;
  vkId?: string;
  googleId?: string;
  avatar?: string; // Avatar field added
  createdAt: Date;
  roles: string[];
  wishlist: string[]; // Array for perfume IDs
  perfumeCollection: string[]; // Array for perfume IDs user owns
  isActivated: boolean; // Account activation status
  activationCode: string; // Code sent to user for email confirmation
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
    default: false, // По умолчанию аккаунт не активирован
  },
  activationCode: {
    type: String, // Поле для хранения кода активации
  },
});

// Хэширование пароля перед сохранением

export default mongoose.model<IUser>('User', UserSchema);
