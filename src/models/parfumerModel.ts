import mongoose, { Schema, Document } from 'mongoose';

interface IParfumer extends Document {
  original: string;
  original_ru: string; // Имя парфюмера на русском
  slug: string;
}

const parfumerSchema: Schema = new Schema({
  original: { type: String, required: true, unique: true },
  original_ru: { type: String, required: false }, // Необязательное поле для русского имени
  slug: { type: String, required: true, unique: true },
});

export default mongoose.model<IParfumer>('Parfumer', parfumerSchema);
