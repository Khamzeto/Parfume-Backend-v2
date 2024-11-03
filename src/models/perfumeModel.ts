import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для индивидуальной оценки пользователя
interface UserRating {
  userId: mongoose.Types.ObjectId;
  smell: number;
  longevity: number;
  sillage: number;
  bottle: number;
  priceValue: number;
}

// Интерфейс для отзыва
interface Review {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
}

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
  reviews: Review[];
  rating_count: number;
  rating_value: number;
  scent_ratings: number[];
  longevity_ratings: number[];
  sillage_ratings: number[];
  packaging_ratings: number[];
  value_ratings: number[];
  user_ratings: UserRating[];
}

// Определение схемы для коллекции "perfumes"
const reviewSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

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
  reviews: [reviewSchema],
  rating_count: { type: Number, default: 0 },
  rating_value: { type: Number, default: 0 },
  scent_ratings: { type: [Number], default: [] },
  longevity_ratings: { type: [Number], default: [] },
  sillage_ratings: { type: [Number], default: [] },
  packaging_ratings: { type: [Number], default: [] },
  value_ratings: { type: [Number], default: [] },
  user_ratings: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      smell: { type: Number, required: true },
      longevity: { type: Number, required: true },
      sillage: { type: Number, required: true },
      bottle: { type: Number, required: true },
      priceValue: { type: Number, required: true },
    },
  ],
});

// Создаем текстовый индекс для полей "name" и "brand"
perfumeSchema.index({ name: 'text', brand: 'text' });

// Экспорт модели "Perfume"
export default mongoose.model<IPerfume>('Perfume', perfumeSchema);
