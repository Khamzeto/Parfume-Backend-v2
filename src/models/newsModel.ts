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
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: { type: String, required: false },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: { type: String, required: false },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replies: [commentReplySchema],
});

const newsSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  coverImage: { type: String, required: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comments: [commentSchema], // Комментарии
  isPopular: { type: Boolean, default: false },
  popularityScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('NewsRequest', newsSchema);
