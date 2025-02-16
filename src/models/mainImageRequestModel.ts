// models/mainImageRequestModel.ts

import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для заявки на изменение главного изображения
export interface IMainImageRequest extends Document {
  perfumeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // ID пользователя, отправившего заявку
  image: string; // Base64 изображение или URL изображения
  status: 'pending' | 'approved' | 'rejected';
}

const mainImageRequestSchema: Schema = new Schema({
  perfumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Поле для ID пользователя
  image: { type: String, required: true }, // Base64 изображение или URL
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
});

export default mongoose.model<IMainImageRequest>(
  'MainImageRequest',
  mainImageRequestSchema
);
