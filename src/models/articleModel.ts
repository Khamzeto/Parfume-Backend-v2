// articleModel.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  avatar?: string;
  content: string;
  createdAt: Date;
  replies: ICommentReply[];
}

export interface ICommentReply {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  avatar?: string;
  content: string;
  createdAt: Date;
}

const commentReplySchema = new Schema<ICommentReply>({
  _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() }, // Добавляем _id
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: { type: String, required: false },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new Schema<IComment>({
  _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() }, // Добавляем _id
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: { type: String, required: false },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replies: [commentReplySchema], // Поддержка ответов на комментарии
});

const articleSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  coverImage: { type: String, required: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comments: [commentSchema], // Комментарии
  isPopular: { type: Boolean, default: false }, // Поле для статуса популярности
  popularityScore: { type: Number, default: 0 }, // Поле для балла популярности
  createdAt: { type: Date, default: Date.now }, // Время создания статьи
});

export default mongoose.model('ArticleRequest', articleSchema);
