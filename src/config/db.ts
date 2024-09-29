// /src/config/db.ts
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Подключение к MongoDB (свойства по умолчанию уже включены)
    await mongoose.connect('mongodb://localhost:27017/parfumo');
    console.log('MongoDB connected');
  } catch (err) {
    // Ошибка подключения
    if (err instanceof Error) {
      console.error('MongoDB connection error:', err.message);
    } else {
      console.error('Unexpected error:', err);
    }
    process.exit(1);
  }
};

export default connectDB;
