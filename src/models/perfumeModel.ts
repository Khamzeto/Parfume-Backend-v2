import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для парфюма
export interface IPerfume extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  brandTranslit?: string;
  brand: string;
  perfume_id: string;
  similar_perfumes: string[];
  tags: string[];
  description: string;
  description_links: { text: string; href: string }[];
  meta_description: string;
  accords: string[];
  notes: {
    top_notes: string[];
    heart_notes: string[];
    base_notes: string[];
    additional_notes: string[];
  };
  name_ru?: string;  // Поле может быть необязательным
  brand_ru?: string; 
  release_year: number;
  gender: string;
  main_image: string;
  additional_images: string[];
  perfumers: string[];
  perfumers_en: string[]; 
  reviews: {
    username: string;
    nickname: string;
    body: string;
    ratings: Record<string, any>;
    awards: string;
    comments: string;
  }[]; // Update reviews to be an array of objects
}

// Определение схемы для коллекции "perfumes"
// Определение схемы для коллекции "perfumes"
const perfumeSchema: Schema = new Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  perfume_id: { type: String, required: true },
  similar_perfumes: [String],
  tags: [String],
  description: String,
  description_links: [{ text: String, href: String }],
  meta_description: String,
  accords: [String],
  notes: {
    top_notes: [String],
    heart_notes: [String],
    base_notes: [String],
    additional_notes: [String],
  },
  release_year: Number,
  gender: String,
  main_image: String,
  additional_images: [String],
  perfumers: [String],
  perfumers_en: [String],
  reviews: [
    {
      username: { type: String, required: true },
      nickname: { type: String, required: true },
      body: { type: String, required: true },
      ratings: { type: Schema.Types.Mixed, default: {} },
      awards: { type: String, default: '0' },
      comments: { type: String, default: '0' },
    },
  ],
});

// Создаем текстовый индекс для полей "name" и "brand"
perfumeSchema.index({ name: 'text', brand: 'text' });

// Экспорт модели "Perfume"
export default mongoose.model<IPerfume>('Perfume', perfumeSchema);
