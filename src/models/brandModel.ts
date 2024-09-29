import mongoose, { Schema, Document } from 'mongoose';

interface IBrand extends Document {
  original: string;
  slug: string;
}

const brandSchema: Schema = new Schema({
  original: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true }
});

export default mongoose.model<IBrand>('Brand', brandSchema);
