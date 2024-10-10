import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для заявки на добавление статьи
export interface IArticleRequest extends Document {
  title: string;
  description: string;
  content: string;
  userId: mongoose.Types.ObjectId; // ID пользователя, отправившего статью
  status: 'pending' | 'approved' | 'rejected';
}

const articleRequestSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true }, // Основное содержание статьи
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Поле для ID пользователя
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // Статус заявки
});

export default mongoose.model<IArticleRequest>('ArticleRequest', articleRequestSchema);
