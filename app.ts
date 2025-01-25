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

import path from 'path';

const app: Application = express();
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
import { SitemapStream, streamToPromise } from 'sitemap';
import { Request, Response } from 'express';
import perfumeModel from './src/models/perfumeModel';

// Добавьте этот маршрут в ваш код
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Добавляем основные маршруты
    sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    sitemap.write({ url: '/perfumes', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/parfumers', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/brands', changefreq: 'weekly', priority: 0.7 });
    sitemap.write({ url: '/notes', changefreq: 'weekly', priority: 0.7 });
    sitemap.write({ url: '/shops', changefreq: 'weekly', priority: 0.6 });
    sitemap.write({ url: '/news', changefreq: 'daily', priority: 0.9 });

    // Подсчитываем общее количество парфюмов
    const totalPerfumes = await perfumeModel.countDocuments();
    const perfumesPerPage = 5000; // Количество парфюмов на одну страницу
    const totalPages = Math.ceil(totalPerfumes / perfumesPerPage);

    // Генерация ссылок на вложенные сайтмапы
    for (let page = 1; page <= totalPages; page++) {
      sitemap.write({
        url: `/sitemap-perfumes-${page}.xml`,
        changefreq: 'weekly',
        priority: 0.8,
      });
    }

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации sitemap:', error);
    res.status(500).send('Ошибка генерации sitemap');
  }
});
app.get('/sitemap-perfumes-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10); // Номер страницы
    const perfumesPerPage = 5000; // Лимит записей на странице
    const skip = (page - 1) * perfumesPerPage; // Сколько записей пропустить

    if (page < 1) {
      return res.status(400).json({ message: 'Номер страницы должен быть больше 0.' });
    }

    const perfumes = await perfumeModel
      .find({})
      .select('main_image name perfume_id') // Выбираем только необходимые поля
      .skip(skip)
      .limit(perfumesPerPage);

    if (perfumes.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Добавляем парфюмы в сайтмап
    perfumes.forEach(perfume => {
      sitemap.write({
        url: `/perfumes/${perfume.perfume_id}`,
        changefreq: 'weekly',
        priority: 0.8,
        img: [
          {
            url: perfume.main_image,
            title: perfume.name,
          },
        ],
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации вложенного sitemap:', error);
    res.status(500).send('Ошибка генерации вложенного sitemap');
  }
});

// Пример маршрута
app.get('/', (req, res) => {
  res.send('Сервер работает!');
});
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
