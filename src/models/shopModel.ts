// models/shopModel.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  name: string;
  url: string;
  location: string;
  rating: number;
  image: string;
}

const shopSchema: Schema<IShop> = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },
  image: {
    type: String,
    required: false,
  },
});

export default mongoose.model<IShop>('Shop', shopSchema);
