import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для заявки на добавление фото
export interface IGalleryRequest extends Document {
  perfumeId: mongoose.Types.ObjectId;
  images: string[]; // Массив base64 изображений
  status: 'pending' | 'approved' | 'rejected';
}

const galleryRequestSchema: Schema = new Schema({
  perfumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume', required: true },
  images: { type: [String], required: true }, // Base64 изображения
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
});

export default mongoose.model<IGalleryRequest>('GalleryRequest', galleryRequestSchema);
