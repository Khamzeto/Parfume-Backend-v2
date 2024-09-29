import mongoose, { Schema, Document } from 'mongoose';

interface IParfumer extends Document {
  original: string;
  slug: string;
}

const parfumerSchema: Schema = new Schema({
  original: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
});

export default mongoose.model<IParfumer>('Parfumer', parfumerSchema);
