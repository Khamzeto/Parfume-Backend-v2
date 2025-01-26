import express, { Application, Request, Response } from 'express';
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

import { SitemapStream, streamToPromise } from 'sitemap';

import perfumeModel from './src/models/perfumeModel';
import newsModel from './src/models/newsModel';
import articleModel from './src/models/articleModel';
import parfumerModel from './src/models/parfumerModel';
import noteModel from './src/models/noteModel';
import brandModel from './src/models/brandModel';

dotenv.config();
connectDB();

const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
app.use(passport.initialize());
passportConfig(passport);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ========== SITEMAP ROUTES ========== //

// -- Master sitemap.xml -- //
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    // Ссылки на вложенные сайтмапы
    sitemap.write({ url: '/pages-sitemap.xml', changefreq: 'weekly', priority: 0.9 });
    sitemap.write({ url: '/news-sitemap.xml', changefreq: 'hourly', priority: 0.9 });
    sitemap.write({ url: '/brands-sitemap.xml', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/notes-sitemap.xml', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/search-sitemap.xml', changefreq: 'weekly', priority: 0.7 });
    sitemap.write({ url: '/articles-sitemap.xml', changefreq: 'hourly', priority: 0.8 });
    sitemap.write({ url: '/parfumers-sitemap.xml', changefreq: 'weekly', priority: 0.8 });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации sitemap:', error);
    res.status(500).send('Ошибка генерации sitemap');
  }
});

// -- Pages sitemap -- //
app.get('/pages-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Статические страницы сайта
    sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    sitemap.write({ url: '/about', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/login', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/my-articles', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/brands', changefreq: 'weekly', priority: 0.9 });
    sitemap.write({ url: '/contacts', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/my-news', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/create-news', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/news', changefreq: 'weekly', priority: 0.9 });
    sitemap.write({ url: '/forgot-password', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/change-profile', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/notes', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/parfumers', changefreq: 'weekly', priority: 0.9 });
    sitemap.write({ url: '/register', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/create-article', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/profile', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/faq', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/search', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/privacy', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/stores', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/similar', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/reklama', changefreq: 'daily', priority: 0.7 });
    sitemap.write({ url: '/articles', changefreq: 'weekly', priority: 0.9 });
    sitemap.write({ url: '/terms', changefreq: 'daily', priority: 0.7 });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации pages-sitemap:', error);
    res.status(500).send('Ошибка генерации pages-sitemap');
  }
});

// -- News sitemap -- //
app.get('/news-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Получение списка новостей (без поля updatedAt)
    const news = await newsModel.find().select('_id coverImage title');

    news.forEach(item => {
      sitemap.write({
        url: `/new/${item._id}`, // URL для новости
        changefreq: 'hourly', // Updates every hour
        priority: 0.9,
        img: item.coverImage
          ? [
              {
                url: `https://hltback.parfumetrika.ru/${item.coverImage}`, // Updated URL for the image
                title: item.title, // Title for the image
              },
            ]
          : undefined, // If no image, skip the field
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации news-sitemap:', error);
    res.status(500).send('Ошибка генерации news-sitemap');
  }
});

// -- Parfumers sitemap (parent) -- //
app.get('/parfumers-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalParfumers = await parfumerModel.countDocuments(); // Общее количество парфюмеров
    const parfumersPerPage = 5000; // Количество парфюмеров на один дочерний сайтмап
    const totalPages = Math.ceil(totalParfumers / parfumersPerPage);

    // Генерация ссылок на дочерние сайтмапы
    for (let page = 1; page <= totalPages; page++) {
      sitemap.write({
        url: `/parfumers-sitemap-${page}.xml`,
        changefreq: 'weekly',
        priority: 0.8,
      });
    }

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации родительского sitemap:', error);
    res.status(500).send('Ошибка генерации родительского sitemap');
  }
});

// -- Parfumers sitemap (children) -- //
app.get('/parfumers-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10); // Номер страницы
    const parfumersPerPage = 5000; // Количество парфюмеров на странице
    const skip = (page - 1) * parfumersPerPage;

    if (page < 1) {
      return res.status(400).json({ message: 'Номер страницы должен быть больше 0.' });
    }

    const parfumers = await parfumerModel
      .find()
      .select('slug')
      .skip(skip)
      .limit(parfumersPerPage);

    if (parfumers.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    parfumers.forEach(parfumer => {
      sitemap.write({
        url: `/parfumer/${parfumer.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации дочернего sitemap:', error);
    res.status(500).send('Ошибка генерации дочернего sitemap');
  }
});

app.get('/brands-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalBrands = await brandModel.countDocuments(); // Общее количество брендов
    const brandsPerPage = 5000; // Количество брендов на один дочерний сайтмап
    const totalPages = Math.ceil(totalBrands / brandsPerPage);

    // Генерация ссылок на дочерние сайтмапы
    for (let page = 1; page <= totalPages; page++) {
      sitemap.write({
        url: `/brands-sitemap-${page}.xml`,
        changefreq: 'weekly',
        priority: 0.8,
      });
    }

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации родительского sitemap:', error);
    res.status(500).send('Ошибка генерации родительского sitemap');
  }
});

// Brands Sitemap - Children
app.get('/brands-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10); // Номер страницы
    const brandsPerPage = 5000; // Количество брендов на странице
    const skip = (page - 1) * brandsPerPage;

    if (page < 1) {
      return res.status(400).json({ message: 'Номер страницы должен быть больше 0.' });
    }

    const brands = await brandModel
      .find()
      .select('slug original')
      .skip(skip)
      .limit(brandsPerPage);

    if (brands.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    brands.forEach(brand => {
      sitemap.write({
        url: `/brand/${brand.slug}`, // URL для бренда
        changefreq: 'weekly',
        priority: 0.7,
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации дочернего sitemap:', error);
    res.status(500).send('Ошибка генерации дочернего sitemap');
  }
});

// -- Notes sitemap (parent) -- //
app.get('/notes-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalNotes = await noteModel.countDocuments(); // Общее количество нот
    const notesPerPage = 5000; // Количество нот на одну страницу
    const totalPages = Math.ceil(totalNotes / notesPerPage);

    // Генерация ссылок на дочерние сайтмапы
    for (let page = 1; page <= totalPages; page++) {
      sitemap.write({
        url: `/notes-sitemap-${page}.xml`,
        changefreq: 'weekly',
        priority: 0.8,
      });
    }

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации родительского sitemap:', error);
    res.status(500).send('Ошибка генерации родительского sitemap');
  }
});

// -- Notes sitemap (children) -- //
app.get('/notes-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10); // Номер страницы
    const notesPerPage = 5000; // Лимит записей на страницу
    const skip = (page - 1) * notesPerPage;

    if (page < 1) {
      return res.status(400).json({ message: 'Номер страницы должен быть больше 0.' });
    }

    const notes = await noteModel
      .find()
      .select('_id name image')
      .skip(skip)
      .limit(notesPerPage);

    if (notes.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    notes.forEach(note => {
      sitemap.write({
        url: `/note/${note._id}`, // URL для ноты
        changefreq: 'weekly',
        priority: 0.7,
        img: note.image
          ? [
              {
                url: note.image,
                title: note.name,
              },
            ]
          : undefined,
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации дочернего sitemap:', error);
    res.status(500).send('Ошибка генерации дочернего sitemap');
  }
});

// -- Articles sitemap -- //
app.get('/articles-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Получение списка статей (без поля updatedAt)
    const articles = await articleModel.find().select('_id coverImage title');

    articles.forEach(article => {
      sitemap.write({
        url: `/articles/${article._id}`, // URL для статьи
        changefreq: 'hourly', // Updates every hour
        priority: 0.8,
        img: article.coverImage
          ? [
              {
                url: `https://hltback.parfumetrika.ru/${article.coverImage}`, // Updated URL for the image
                title: article.title, // Title for the image
              },
            ]
          : undefined, // If no image, skip the field
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации articles-sitemap:', error);
    res.status(500).send('Ошибка генерации articles-sitemap');
  }
});

// -- Search sitemap (parent) -- //
app.get('/search-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalPerfumes = await perfumeModel.countDocuments(); // Общее количество парфюмов
    const perfumesPerPage = 5000; // Количество парфюмов на один дочерний сайтмап
    const totalPages = Math.ceil(totalPerfumes / perfumesPerPage);

    // Генерация ссылок на дочерние сайтмапы
    for (let page = 1; page <= totalPages; page++) {
      sitemap.write({
        url: `/search-sitemap-${page}.xml`,
        changefreq: 'weekly',
        priority: 0.8,
      });
    }

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации родительского sitemap:', error);
    res.status(500).send('Ошибка генерации родительского sitemap');
  }
});

// -- Search sitemap (children) -- //
app.get('/search-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10); // Номер страницы
    const perfumesPerPage = 5000; // Количество парфюмов на страницу
    const skip = (page - 1) * perfumesPerPage;

    if (page < 1) {
      return res.status(400).json({ message: 'Номер страницы должен быть больше 0.' });
    }

    const perfumes = await perfumeModel
      .find()
      .select('_id name perfume_id main_image brand')
      .skip(skip)
      .limit(perfumesPerPage);

    if (perfumes.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    perfumes.forEach(perfume => {
      sitemap.write({
        url: `/perfumes/${perfume.perfume_id}`,
        changefreq: 'weekly',
        priority: 0.7,
        img: perfume.main_image
          ? [
              {
                url: perfume.main_image,
                title: `${perfume.brand} - ${perfume.name}`,
              },
            ]
          : undefined,
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации дочернего sitemap:', error);
    res.status(500).send('Ошибка генерации дочернего sitemap');
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
  'https://hltdot.parfumetrika.ru',
];
passportConfig(passport);
dotenv.config();
app.use(passport.initialize());

// Настройка CORS с проверкой источника
app.use(
  cors({
    origin: (origin, callback) => {
      // Разрешить запросы без источника (например, мобильные приложения, Postman, CURL)
      if (!origin) {
        console.log(
          'Запрос без источника (Postman, мобильное приложение и т.д.) разрешён.'
        );
        return callback(null, true);
      }

      // Проверяем, включён ли источник в список разрешённых
      if (allowedOrigins.includes(origin)) {
        console.log(`CORS разрешён для источника: ${origin}`);
        callback(null, true);
      } else {
        console.error(`CORS заблокировал запрос с источника: ${origin}`);
        callback(new Error('Запрос отклонён политикой CORS. Источник не разрешён.'));
      }
    },
    credentials: true, // Разрешить использование cookies и учетных данных
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Указание разрешённых методов
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Разрешённые заголовки
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
