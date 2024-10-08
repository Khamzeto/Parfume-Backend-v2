// models/User.ts

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  username: string;
  email?: string;
  password?: string;
  vkId?: string;
  googleId?: string;
  createdAt: Date;
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
    sparse: true, // позволяет уникальные значения или null
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Хэширование пароля перед сохранением
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    return next();
  } catch (err: any) {
    return next(err);
  }
});

// Метод для проверки пароля
UserSchema.methods.isValidPassword = async function (password: string): Promise<boolean> {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  } catch (err) {
    throw err;
  }
};

export default mongoose.model<IUser>('User', UserSchema);
