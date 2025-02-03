import express, { Application, Request, Response } from 'express';
import connectDB from './src/config/db'; // Подключение к БД
import perfumeRoutes from './src/routes/perfumeRoutes';
import parfumerRoutes from './src/routes/parfumerRoutes';
import brandRoutes from './src/routes/brandRoutes';
import noteRoutes from './src/routes/noteRoutes';
import requestRoutes from './src/routes/requestRoutes';
import authRoutes from './src/routes/authRoutes';
import userRoutes from './src/routes/userRoutes';
import galleryRoutes from './src/routes/galleryRoutes';
import mainImageRoutes from './src/routes/mainImageRoutes';
import articleRoutes from './src/routes/articleRoutes';
import newsRoutes from './src/routes/newsRoutes';
import shopRoutes from './src/routes/shopRoutes';
const multer = require('multer');

import bodyParser from 'body-parser';
import cors from 'cors';
import passportConfig from './src/config/passport';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';

// Модули для генерации sitemap
import { SitemapStream, streamToPromise } from 'sitemap';

import perfumeModel from './src/models/perfumeModel';
import newsModel from './src/models/newsModel';
import articleModel from './src/models/articleModel';
import parfumerModel from './src/models/parfumerModel';
import noteModel from './src/models/noteModel';
import brandModel from './src/models/brandModel';

dotenv.config();
connectDB(); // Сразу подключаемся к БД

const app: Application = express();

// Папка для загрузок (статические файлы)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Настраиваем body-parser
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
const uploadPath = '/var/www/www-root/data/www/parfumetrika.ru/note_images';

// Настройка Multer
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadPath); // Сохраняем файлы в указанной папке
  },
  filename: (req: any, file: any, cb: any) => {
    console.log('req.body перед обработкой:', req.body); // Проверка

    let customFileName = req.body.filename || file.originalname;

    // Убираем расширение из переданного filename (если есть)
    customFileName = customFileName.replace(/\.[^/.]+$/, '');

    // Получаем расширение из оригинального файла
    const fileExtension = path.extname(file.originalname);

    // Создаём итоговое имя файла
    const finalFileName = `${customFileName}${fileExtension}`;

    console.log('Файл будет сохранён как:', finalFileName);

    cb(null, finalFileName);
  },
});

// Используем `upload.single('photo')` для загрузки одного файла
const upload = multer({ storage }).single('photo');

// POST-запрос для загрузки файла
app.post('/upload_notes', upload, (req: Request, res: Response) => {
  const file = (req as any).file; // Получаем файл
  console.log('req.body после обработки:', req.body); // Проверка

  if (!file) {
    return res.status(400).json({ message: 'Файл не был загружен' });
  }

  res.status(200).json({
    message: 'Файл успешно загружен',
    file: {
      filename: file.filename, // Итоговое имя файла
      path: `/note_images/${file.filename}`, // Путь для клиента
    },
  });
});

// Инициализируем Passport
passportConfig(passport);
app.use(passport.initialize());

// Список разрешённых доменов (Origin)
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
  // 'https://hltback.parfumetrika.ru' // Добавьте при необходимости
];

// Подключаем CORS с проверкой источника
app.use(
  cors({
    origin: (origin, callback) => {
      // Разрешаем запросы без заголовка Origin (например, из Postman или CLI)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Не разрешено политикой CORS'));
      }
    },
    credentials: true,
  })
);

// ========== Пример простого маршрута проверки ========== //
app.get('/', (req: Request, res: Response) => {
  res.send('Сервер работает!');
});

// ========== Блок Sitemap-роутов ========== //

// -- Master sitemap.xml -- //
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    // Ссылки на вложенные сайтмапы:
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
        changefreq: 'hourly', // Обновляем почасово
        priority: 0.9,
        img: item.coverImage
          ? [
              {
                url: `https://hltback.parfumetrika.ru/${item.coverImage}`, // Картинка
                title: item.title,
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
    console.error('Ошибка генерации news-sitemap:', error);
    res.status(500).send('Ошибка генерации news-sitemap');
  }
});

// -- Parfumers sitemap (parent) -- //
app.get('/parfumers-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalParfumers = await parfumerModel.countDocuments();
    const parfumersPerPage = 5000;
    const totalPages = Math.ceil(totalParfumers / parfumersPerPage);

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
    console.error('Ошибка генерации парент-сайтмапа парфюмеров:', error);
    res.status(500).send('Ошибка генерации парент-сайтмапа парфюмеров');
  }
});

// -- Parfumers sitemap (children) -- //
app.get('/parfumers-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10);
    const parfumersPerPage = 5000;
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
    console.error('Ошибка генерации чайлд-сайтмапа парфюмеров:', error);
    res.status(500).send('Ошибка генерации чайлд-сайтмапа парфюмеров');
  }
});

// -- Brands sitemap (parent) -- //
app.get('/brands-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalBrands = await brandModel.countDocuments();
    const brandsPerPage = 5000;
    const totalPages = Math.ceil(totalBrands / brandsPerPage);

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
    console.error('Ошибка генерации родительского sitemap брендов:', error);
    res.status(500).send('Ошибка генерации родительского sitemap брендов');
  }
});

// -- Brands sitemap (children) -- //
app.get('/brands-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10);
    const brandsPerPage = 5000;
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
        url: `/brand/${brand.slug}`,
        changefreq: 'weekly',
        priority: 0.7,
      });
    });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации дочернего sitemap брендов:', error);
    res.status(500).send('Ошибка генерации дочернего sitemap брендов');
  }
});

// -- Notes sitemap (parent) -- //
app.get('/notes-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalNotes = await noteModel.countDocuments();
    const notesPerPage = 5000;
    const totalPages = Math.ceil(totalNotes / notesPerPage);

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
    console.error('Ошибка генерации родительского sitemap нот:', error);
    res.status(500).send('Ошибка генерации родительского sitemap нот');
  }
});

// -- Notes sitemap (children) -- //
app.get('/notes-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10);
    const notesPerPage = 5000;
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
        url: `/note/${note._id}`,
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
    console.error('Ошибка генерации дочернего sitemap нот:', error);
    res.status(500).send('Ошибка генерации дочернего sitemap нот');
  }
});

// -- Articles sitemap -- //
app.get('/articles-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Получение только одобренных статей (status: 'approved')
    const articles = await articleModel
      .find({ status: 'approved' })
      .select('_id coverImage title');

    articles.forEach(article => {
      sitemap.write({
        url: `/article/${article._id}`,
        changefreq: 'hourly',
        priority: 0.8,
        img: article.coverImage
          ? [
              {
                url: `https://hltback.parfumetrika.ru/${article.coverImage}`,
                title: article.title,
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
    console.error('Ошибка генерации articles-sitemap:', error);
    res.status(500).send('Ошибка генерации articles-sitemap');
  }
});

// -- Search sitemap (parent) -- //
app.get('/search-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://hltback.parfumetrika.ru' });

    const totalPerfumes = await perfumeModel.countDocuments();
    const perfumesPerPage = 5000;
    const totalPages = Math.ceil(totalPerfumes / perfumesPerPage);

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
    console.error('Ошибка генерации родительского search-sitemap:', error);
    res.status(500).send('Ошибка генерации родительского search-sitemap');
  }
});

// -- Search sitemap (children) -- //
app.get('/search-sitemap-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.params.page, 10);
    const perfumesPerPage = 5000;
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
    console.error('Ошибка генерации дочернего search-sitemap:', error);
    res.status(500).send('Ошибка генерации дочернего search-sitemap');
  }
});

// ========== Подключение основных маршрутов ========== //
app.use('/perfumes', perfumeRoutes);
app.use('/parfumers', parfumerRoutes);
app.use('/notes', noteRoutes);
app.use('/shops', shopRoutes);
app.use('/brands', brandRoutes);
app.use('/requests', requestRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/gallery', galleryRoutes);
app.use('/article', articleRoutes);
app.use('/news', newsRoutes);
app.use('/main-image', mainImageRoutes);

// Запуск сервера
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
