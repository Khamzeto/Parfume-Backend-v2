import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для заявки
export interface IRequest extends Document {
  perfumeId: string;
  changes: any; // Массив с изменениями, которые нужно внести
  status: 'pending' | 'approved' | 'rejected'; // Статус заявки
  createdAt: Date;
  updatedAt: Date;
}

// Схема заявки
const requestSchema: Schema = new Schema({
  perfumeId: { type: mongoose.Types.ObjectId, ref: 'Perfume', required: true }, // ID парфюма
  changes: { type: Schema.Types.Mixed, required: true }, // Данные изменения
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Экспорт модели "Request"
export default mongoose.model<IRequest>('Request', requestSchema);
