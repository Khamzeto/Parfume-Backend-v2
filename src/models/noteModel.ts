import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для ноты
export interface INote extends Document {
  name: string;
  image?: string; // Опциональное поле для изображения
}

const noteSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true }, // уникальное поле для каждой ноты
  image: { type: String }, // Поле для хранения URL изображения
});

export default mongoose.model<INote>('Note', noteSchema);
