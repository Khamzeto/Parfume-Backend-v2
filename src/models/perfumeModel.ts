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
  name_ru?: string;
  brand_ru?: string;
  release_year: number;
  gender: string;
  main_image: string;
  additional_images: string[];
  gallery_images: string[];
  perfumers: string[];
  perfumers_en: string[];
  reviews: {
    userId: mongoose.Types.ObjectId;
    body: string;
    createdAt: Date;
  }[];
  rating_count: number; // Количество оценок
  rating_value: number; // Текущий средний рейтинг
  scent_ratings: number[]; // Оценки по запаху
  longevity_ratings: number[]; // Оценки по долголетию
  sillage_ratings: number[]; // Оценки по шлейфу
  packaging_ratings: number[]; // Оценки по упаковке
  value_ratings: number[]; // Оценки по цене и качеству
}

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
  gallery_images: [String],
  perfumers: [String],
  perfumers_en: [String],
  reviews: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      body: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  rating_count: { type: Number, default: 0 }, // Количество оценок
  rating_value: { type: Number, default: 0 }, // Текущий средний рейтинг

  // Оценки по категориям
  scent_ratings: { type: [Number], default: [] },
  longevity_ratings: { type: [Number], default: [] },
  sillage_ratings: { type: [Number], default: [] },
  packaging_ratings: { type: [Number], default: [] },
  value_ratings: { type: [Number], default: [] },
});

// Создаем текстовый индекс для полей "name" и "brand"
perfumeSchema.index({ name: 'text', brand: 'text' });

// Экспорт модели "Perfume"
export default mongoose.model<IPerfume>('Perfume', perfumeSchema);
