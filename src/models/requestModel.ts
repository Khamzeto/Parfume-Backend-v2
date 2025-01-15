import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для заявки
export interface IRequest extends Document {
  perfumeId: string;
  userId: string; // Добавлено поле userId
  changes: any;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// Схема заявки
const requestSchema: Schema = new Schema({
  perfumeId: { type: mongoose.Types.ObjectId, ref: 'Perfume', required: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true }, // Новый userId
  changes: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IRequest>('Request', requestSchema);
