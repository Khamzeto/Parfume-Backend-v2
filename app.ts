import express, { Application } from 'express';
import connectDB from './src/config/db'; // Правильный путь к файлу подключения к базе данных
import perfumeRoutes from './src/routes/perfumeRoutes';
import parfumerRoutes from './src/routes/parfumerRoutes';
import brandRoutes from './src/routes/brandRoutes'; // Импорт маршрутов для брендов
import noteRoutes from './src/routes/noteRoutes';
import requestRoutes from './src/routes/requestRoutes';
import authRoutes from './src/routes/authRoutes';
import userRoutes from './src/routes/userRoutes';
import galleryRoutes from './src/routes/galleryRoutes';
import mainImageRoutes from './src/routes/mainImageRoutes';
import articleRoutes from './src/routes/articleRoutes';
import newsRoutes from './src/routes/newsRoutes';
import shopRoutes from './src/routes/shopRoutes';
import bodyParser from 'body-parser';
import cors from 'cors';
import passportConfig from './src/config/passport'; // Конфигурация passport
import passport from 'passport'; // Подключение passport
import dotenv from 'dotenv';

const app: Application = express();
const PORT = 3001;
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
// Подключение к MongoDB
connectDB();

// Список разрешенных источников
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://172.20.10.2:3000',
  'http://172.20.10.5:3000',
  'http://172.20.10.2:3001',
  'http://172.20.10.5:3001',
  'http://81.29.136.136:3000',
  'https://parfumetrika.ru',
  'https://www.parfumetrika.ru',
  'https://hltdot.parfumetrika.ru',
];
passportConfig(passport);
dotenv.config();
app.use(passport.initialize());

// Настройка CORS с проверкой источника
app.use(
  cors({
    origin: (origin, callback) => {
      // Разрешить запросы без источника (например, мобильные приложения или CURL)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true); // Разрешить запрос, если источник в списке разрешенных
      } else {
        callback(new Error('Не разрешено политикой CORS')); // Отклонить запрос, если источник не в списке разрешенных
      }
    },
    credentials: true, // Если необходимо поддерживать учетные данные (cookies, авторизация)
  })
);

// Middleware для обработки JSON
app.use(express.json());

// Использование маршрутов для парфюмов
app.use('/perfumes', perfumeRoutes);
app.use('/parfumers', parfumerRoutes);
app.use('/notes', noteRoutes);
app.use('/shops', shopRoutes);
// Использование маршрутов для брендов
app.use('/brands', brandRoutes);
app.use('/requests', requestRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/gallery', galleryRoutes);
app.use('/article', articleRoutes);
app.use('/news', newsRoutes);
app.use('/main-image', mainImageRoutes);
// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
