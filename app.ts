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
import newsModel from './src/models/newsModel';
import articleModel from './src/models/articleModel';
import parfumerModel from './src/models/parfumerModel';
import noteModel from './src/models/noteModel';

// Добавьте этот маршрут в ваш код
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Ссылки на вложенные сайтмапы
    sitemap.write({ url: '/pages-sitemap.xml', changefreq: 'weekly', priority: 0.9 });
    sitemap.write({ url: '/news-sitemap.xml', changefreq: 'daily', priority: 0.9 });
    sitemap.write({ url: '/brands-sitemap.xml', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/notes-sitemap.xml', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/search-sitemap.xml', changefreq: 'weekly', priority: 0.7 });
    sitemap.write({ url: '/articles-sitemap.xml', changefreq: 'weekly', priority: 0.8 });
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

app.get('/pages-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Главные страницы сайта
    sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    sitemap.write({ url: '/about', changefreq: 'monthly', priority: 0.7 });
    sitemap.write({ url: '/contact', changefreq: 'monthly', priority: 0.7 });

    sitemap.end();

    const sitemapXML = await streamToPromise(sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXML.toString());
  } catch (error) {
    console.error('Ошибка генерации pages-sitemap:', error);
    res.status(500).send('Ошибка генерации pages-sitemap');
  }
});
app.get('/news-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Получение списка новостей с их ID, датой обновления и обложкой
    const news = await newsModel.find().select('_id updatedAt coverImage title');

    news.forEach(item => {
      sitemap.write({
        url: `/new/${item._id}`, // URL для новости
        changefreq: 'daily',
        priority: 0.9,
        lastmod: item.updatedAt.toISOString(),
        img: item.coverImage
          ? [
              {
                url: item.coverImage, // URL изображения
                title: item.title, // Название новости как заголовок для изображения
              },
            ]
          : undefined, // Если изображения нет, поле игнорируется
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
app.get('/parfumers-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

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
      .select('slug') // Получаем только `slug`
      .skip(skip)
      .limit(parfumersPerPage);

    if (parfumers.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Добавляем парфюмеров в сайтмап
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
app.get('/notes-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

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
      .select('_id name image') // Получаем только нужные поля
      .skip(skip)
      .limit(notesPerPage);

    if (notes.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Добавляем ноты в сайтмап
    notes.forEach(note => {
      sitemap.write({
        url: `/note/${note._id}`, // URL для ноты (используется `_id`)
        changefreq: 'weekly',
        priority: 0.7,
        img: note.image
          ? [
              {
                url: note.image, // URL изображения
                title: note.name, // Название ноты как заголовок для изображения
              },
            ]
          : undefined, // Если изображения нет, игнорируем это поле
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

app.get('/articles-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Получение списка статей с их ID, датой обновления и обложкой
    const articles = await articleModel.find().select('_id updatedAt coverImage title');

    articles.forEach(article => {
      sitemap.write({
        url: `/articles/${article._id}`, // URL для статьи
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: article.updatedAt?.toISOString(),
        img: article.coverImage
          ? [
              {
                url: article.coverImage, // URL изображения
                title: article.title, // Название статьи как заголовок для изображения
              },
            ]
          : undefined, // Если изображения нет, поле игнорируется
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

app.get('/search-sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

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
      .select('_id name perfume_id main_image brand') // Получаем только нужные поля
      .skip(skip)
      .limit(perfumesPerPage);

    if (perfumes.length === 0) {
      return res.status(404).json({ message: 'Нет данных для этой страницы.' });
    }

    const sitemap = new SitemapStream({ hostname: 'https://parfumetrika.ru' });

    // Добавляем парфюмы в сайтмап
    perfumes.forEach(perfume => {
      sitemap.write({
        url: `/search/${perfume.perfume_id}`, // URL для парфюма
        changefreq: 'weekly',
        priority: 0.7,
        img: perfume.main_image
          ? [
              {
                url: perfume.main_image, // URL главного изображения
                title: `${perfume.brand} - ${perfume.name}`, // Название парфюма как заголовок для изображения
              },
            ]
          : undefined, // Если изображения нет, игнорируем это поле
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
