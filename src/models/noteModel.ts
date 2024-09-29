import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для ноты
export interface INote extends Document {
  name: string;
}

const noteSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true }, // уникальное поле для каждой ноты
});

export default mongoose.model<INote>('Note', noteSchema);
