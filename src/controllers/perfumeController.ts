import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import Fuse from 'fuse.js';
import { transliterate as tr, slugify } from 'transliteration';
import axios from 'axios';
import mongoose from 'mongoose';

// Функция для перевода текста
const translateText = async (
  text: string,
  srcLang: string,
  targetLang: string
): Promise<string> => {
  const url = 'https://translate.google.com/translate_a/single';
  const params = {
    client: 'gtx',
    sl: srcLang,
    tl: targetLang,
    dt: 't',
    q: text,
  };

  try {
    const response = await axios.get(url, { params });
    return response.data[0][0][0];
  } catch (err) {
    throw new Error(`Ошибка перевода текста: ${(err as Error).message}`);
  }
};

// Контроллер для обновления
export const translateAndUpdateAllFields = async (
  req: Request,
  res: Response
): Promise<void> => {
  const srcLang = 'en';
  const targetLang = 'ru';

  try {
    const perfumes = await Perfume.find();
    if (perfumes.length === 0) {
      res.status(404).json({ message: 'Парфюмы не найдены в базе данных' });
      return;
    }

    for (const perfume of perfumes) {
      try {
        const translatedName = await translateText(perfume.name, srcLang, targetLang);
        const translatedBrand = await translateText(perfume.brand, srcLang, targetLang);

        // Обновляем документ
        const result = await Perfume.updateOne(
          { _id: perfume._id },
          { $set: { name_ru: translatedName, brand_ru: translatedBrand } }
        );

        // Логируем количество обновленных документов
        console.log(
          `Updated document with ID ${perfume._id}, modified: ${result.modifiedCount}`
        );
      } catch (err) {
        console.error(
          `Не удалось обновить документ ID ${perfume._id}: ${(err as Error).message}`
        );
        continue;
      }
    }

    res.json({ message: 'Успешно обновлены все парфюмы с полями name_ru и brand_ru' });
  } catch (err) {
    console.error(`Ошибка при обновлении парфюмов: ${(err as Error).message}`);
    res.status(500).json({ message: (err as Error).message });
  }
};

export const searchPerfumes = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      query,
      queryBrand,
      page = 1,
      limit = 20,
      sortBy = 'popular',
      gender,
      year,
      notes,
    } = req.query;

    // Определяем, нужно ли искать по бренду
    const isBrandSearch = Boolean(queryBrand);
    const searchQuery = isBrandSearch ? queryBrand : query;

    // Нормализуем строку поиска, если она является строкой
    let normalizedQuery = '';
    if (typeof searchQuery === 'string') {
      normalizedQuery = searchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Параметры пагинации и сортировки
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Устанавливаем критерии сортировки
    let sortCriteria: any = {};
    if (sortBy === 'popular') {
      sortCriteria = { rating_count: -1, rating_value: -1 };
    } else if (sortBy === 'unpopular') {
      sortCriteria = { rating_count: 1, rating_value: 1 };
    } else if (sortBy === 'newest') {
      sortCriteria = { release_year: -1 };
    }

    // Создаем фильтры
    const filters: any = {};
    const andConditions: any[] = [];

    // Применяем фильтрацию по названию и бренду только если значения заданы и являются строками
    if (typeof queryBrand === 'string' && typeof query === 'string') {
      andConditions.push({
        brand: { $regex: new RegExp(`^${queryBrand}$`, 'i') },
        name: { $regex: new RegExp(query, 'i') },
      });
    } else if (typeof queryBrand === 'string') {
      andConditions.push({
        brand: { $regex: new RegExp(`^${queryBrand}$`, 'i') },
      });
    } else if (typeof query === 'string') {
      andConditions.push({
        name: { $regex: new RegExp(query, 'i') },
      });
    }

    // Дополнительные фильтры для гендера, года и нот
    if (gender) filters.gender = gender;
    if (year) filters.release_year = Number(year);

    if (notes) {
      const notesArray = Array.isArray(notes)
        ? notes.map(note => String(note).trim())
        : (notes as string).split(',').map(note => note.trim());

      andConditions.push({
        $or: [
          { 'notes.top_notes': { $in: notesArray } },
          { 'notes.heart_notes': { $in: notesArray } },
          { 'notes.base_notes': { $in: notesArray } },
          { 'notes.additional_notes': { $in: notesArray } },
        ],
      });
    }

    if (andConditions.length > 0) filters.$and = andConditions;

    // Построение pipeline для агрегации
    const pipeline: any[] = [
      { $match: filters },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $addFields: {
          rating_count: { $ifNull: ['$rating_count', 0] },
          rating_value: { $ifNull: ['$rating_value', 0] },
        },
      },
    ];

    const searchResults = await Perfume.aggregate(pipeline);

    // Подсчитываем общее количество результатов
    const totalResults = await Perfume.countDocuments(filters);
    const totalPages = Math.ceil(totalResults / limitNumber);

    res.json({
      results: searchResults,
      totalPages,
      currentPage: pageNumber,
      totalResults,
      searchType: isBrandSearch ? 'brands' : 'perfumes',
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const searchBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, page = 1, limit = 10, sortBy = 'relevance', gender, year } = req.query;

    // Проверка наличия query
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: 'Query parameter is required' });
      return;
    }

    // Нормализация и транслитерация запроса
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Нормализация
    const transliteratedQuery = tr(normalizedQuery.toLowerCase()); // Транслитерация

    // Параметры пагинации
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Определение сортировки
    let sortCriteria: any = { exactMatch: -1 }; // По умолчанию сортировка по точным совпадениям

    // Установка сортировки по популярности или непопулярности
    if (sortBy === 'popular') {
      sortCriteria = { rating_count: -1, rating_value: -1 }; // Сортировка по количеству отзывов и рейтингу по убыванию
    } else if (sortBy === 'unpopular') {
      sortCriteria = { rating_count: 1, rating_value: 1 }; // Сортировка по количеству отзывов и рейтингу по возрастанию
    }

    // Фильтры по гендеру и году
    const filters: any = {
      $or: [
        { brand: { $regex: normalizedQuery, $options: 'i' } }, // Поиск по бренду на латинице
        { brand: { $regex: transliteratedQuery, $options: 'i' } }, // Поиск по транслитерированному бренду
        { brand_ru: { $regex: query, $options: 'i' } }, // Поиск по бренду на русском
      ],
    };

    if (gender) {
      filters.gender = gender;
    }

    if (year) {
      filters.release_year = Number(year);
    }

    // Выполнение запроса для поиска по брендам
    const brandsFromDb = await Perfume.aggregate([
      { $match: filters },
      {
        $addFields: {
          exactMatch: {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$brand', normalizedQuery] },
                  { $eq: ['$brand', transliteratedQuery] },
                  { $eq: ['$brand_ru', query] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
          rating_count: { $ifNull: ['$rating_count', 0] }, // Убедитесь, что поле для сортировки не пустое
          rating_value: { $ifNull: ['$rating_value', 0] },
        },
      },
      { $sort: sortCriteria }, // Сортировка по критерию (популярность или непопулярность)
      { $skip: skip },
      { $limit: limitNumber },
    ]);

    // Если результаты отсутствуют
    if (brandsFromDb.length === 0) {
      res.status(404).json({ message: 'Brands not found' });
      return;
    }

    // Подсчет общего количества результатов для пагинации
    const totalResults = await Perfume.countDocuments(filters);

    const totalPages = Math.ceil(totalResults / limitNumber);

    // Ответ клиенту с результатами
    res.json({
      brands: brandsFromDb,
      totalPages: totalPages,
      currentPage: pageNumber,
      totalResults: totalResults,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getPerfumeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfume = await Perfume.findOne({ perfume_id: req.params.perfume_id }).populate(
      {
        path: 'reviews.userId', // указываем путь к userId в reviews
        select: 'username', // выбираем только нужные поля
      }
    );

    if (!perfume) {
      res.status(404).json({ message: 'Парфюм не найден' });
      return;
    }

    res.json(perfume);
  } catch (err) {
    console.error('Ошибка при получении парфюма:', err);
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getPerfumesByIds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { perfumeIds } = req.body; // Ожидаем массив ID в теле запроса

    // Проверяем, что perfumeIds - это массив
    if (!Array.isArray(perfumeIds)) {
      res
        .status(400)
        .json({ message: 'Invalid input. Expected an array of perfume IDs.' });
      return;
    }

    // Поиск парфюмов по массиву ID
    const perfumes = await Perfume.find({ perfume_id: { $in: perfumeIds } });

    // Проверка на случай, если парфюмы не найдены
    if (!perfumes.length) {
      res.status(404).json({ message: 'No perfumes found for the provided IDs.' });
      return;
    }

    // Возвращаем найденные парфюмы
    res.json(perfumes);
  } catch (err) {
    res
      .status(500)
      .json({ message: `Error fetching perfumes: ${(err as Error).message}` });
  }
};

// Получение всех парфюмов с сортировкой
export const getAllPerfumes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, sortBy = 'popular' } = req.query;

    // Преобразование значений из query params в нужные типы
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Условие для сортировки по популярности или непопулярности
    const sortCondition =
      sortBy === 'popular' ? { rating_count: -1 } : { rating_count: 1 };

    // Запрос с фильтрацией, пагинацией и сортировкой
    const perfumes = await Perfume.find()
      .sort(sortCondition as { [key: string]: 1 | -1 }) // Указываем тип явным образом
      .skip(skip)
      .limit(limitNumber);

    // Общее количество документов для пагинации
    const totalPerfumes = await Perfume.countDocuments();

    res.json({
      perfumes,
      totalPages: Math.ceil(totalPerfumes / limitNumber),
      currentPage: pageNumber,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

// Получение всех парфюмов по бренду
export const getPerfumesByBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfumes = await Perfume.find({ brand: req.params.brand });
    if (perfumes.length === 0) {
      res.status(404).json({ message: 'No perfumes found for this brand' });
      return;
    }
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

// Создание нового парфюма
export const createPerfume = async (req: Request, res: Response): Promise<void> => {
  const perfume = new Perfume(req.body);

  try {
    const newPerfume = await perfume.save();
    res.status(201).json(newPerfume);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// Обновление парфюма по ID
export const updatePerfume = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedPerfume = await Perfume.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedPerfume) {
      res.status(404).json({ message: 'Perfume not found' });
      return;
    }
    res.json(updatedPerfume);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// Удаление парфюма по ID
export const deletePerfume = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfume = await Perfume.findByIdAndDelete(req.params.id);
    if (!perfume) {
      res.status(404).json({ message: 'Perfume not found' });
      return;
    }
    res.json({ message: 'Perfume deleted' });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
export const uploadGalleryImages = async (req: Request, res: Response) => {
  const { perfumeId } = req.params;
  const { images } = req.body; // Массив изображений в формате base64

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ message: 'Нет изображений для загрузки' });
  }

  try {
    // Поиск парфюма по ID
    const perfume = await Perfume.findById(perfumeId);

    if (!perfume) {
      return res.status(404).json({ message: 'Парфюм не найден' });
    }

    // Добавление изображений в массив gallery_images
    perfume.gallery_images = [...perfume.gallery_images, ...images];

    // Сохранение обновленного парфюма
    await perfume.save();

    res.status(200).json({
      message: 'Изображения успешно загружены',
      gallery_images: perfume.gallery_images,
    });
  } catch (error) {
    console.error('Ошибка загрузки изображений:', error);
    res.status(500).json({ message: 'Ошибка загрузки изображений' });
  }
};
export const getGalleryImages = async (req: Request, res: Response) => {
  const { perfumeId } = req.params;

  try {
    // Поиск парфюма по ID
    const perfume = await Perfume.findById(perfumeId);

    if (!perfume) {
      return res.status(404).json({ message: 'Парфюм не найден' });
    }

    // Возвращаем массив изображений из галереи
    res.status(200).json({ gallery_images: perfume.gallery_images });
  } catch (error) {
    console.error('Ошибка получения изображений:', error);
    res.status(500).json({ message: 'Ошибка получения изображений' });
  }
};
export const getPerfumesWithSimilarAndSearch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query = '', gender, page = 1, limit = 10 } = req.query;

    // Normalize and transliterate the query string
    const normalizedQuery = (query as string)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Normalize
    const transliteratedQuery = tr(normalizedQuery.toLowerCase()); // Transliterate query

    // Build search filters
    const searchFilters: any = {
      // Ensure similar_perfumes is not null or an empty array
      similar_perfumes: { $elemMatch: { $exists: true, $ne: null } },
      $or: [
        { name: { $regex: normalizedQuery, $options: 'i' } }, // Search by name in original form
        { brand: { $regex: normalizedQuery, $options: 'i' } }, // Search by brand in original form
        { name: { $regex: transliteratedQuery, $options: 'i' } }, // Search by transliterated name
        { brand: { $regex: transliteratedQuery, $options: 'i' } }, // Search by transliterated brand
        { name_ru: { $regex: query, $options: 'i' } }, // Search by name in Russian
        { brand_ru: { $regex: query, $options: 'i' } }, // Search by brand in Russian
      ],
    };

    // Filter by gender if provided
    if (gender) {
      searchFilters.gender = gender;
    }

    // Pagination parameters
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch perfumes with applied search and filters, but only select the necessary fields
    const perfumes = await Perfume.find(
      searchFilters,
      'name gender similar_perfumes main_image brand type perfume_id'
    )
      .skip(skip)
      .limit(limitNumber)
      .lean(); // Use lean() to return plain JS objects

    // If no perfumes are found
    if (perfumes.length === 0) {
      res.status(404).json({
        message: 'Парфюмы не найдены по указанным критериям.',
      });
      return;
    }

    // Fetch details for similar perfumes using the IDs from `similar_perfumes`
    for (let perfume of perfumes) {
      if (perfume.similar_perfumes && perfume.similar_perfumes.length > 0) {
        const similarPerfumeDetails = await Perfume.find(
          { perfume_id: { $in: perfume.similar_perfumes } },
          'name perfume_id main_image brand type' // Fetch only the necessary fields for similar perfumes
        ).lean();

        // Add the details of similar perfumes in a new field without modifying the existing array
        (perfume as any).similar_perfume_details = similarPerfumeDetails;
      }
    }

    // Get the total count of matching perfumes for pagination
    const totalResults = await Perfume.countDocuments(searchFilters);
    const totalPages = Math.ceil(totalResults / limitNumber);

    // Respond with the list of perfumes and pagination details
    res.json({
      perfumes,
      totalPages,
      currentPage: pageNumber,
      totalResults,
    });
  } catch (err) {
    console.error(
      `Ошибка при получении парфюмов с похожими парфюмами: ${(err as Error).message}`
    );
    res.status(500).json({ message: (err as Error).message });
  }
};
export const getRecentPerfumes = async (req: Request, res: Response): Promise<void> => {
  try {
    // Находим последние 20 парфюмов, сортируя по _id
    const recentPerfumes = await Perfume.find()
      .sort({ _id: -1 }) // Сортировка по убыванию _id
      .limit(20); // Ограничение количества результатов

    res.json({
      perfumes: recentPerfumes,
      totalResults: recentPerfumes.length,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
export const addReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { perfume_id } = req.params; // Get perfume_id from route parameters
    const { userId, body } = req.body;

    // Check that all required fields are filled
    if (!userId || !body) {
      res.status(400).json({ message: 'userId и body обязательны для отзыва' });
      return;
    }

    // Find the perfume by perfume_id and add the review
    const perfume = await Perfume.findOneAndUpdate(
      { perfume_id },
      {
        $push: {
          reviews: {
            userId: new mongoose.Types.ObjectId(userId),
            body,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!perfume) {
      res.status(404).json({ message: 'Парфюм не найден' });
      return;
    }

    res.status(201).json({ message: 'Отзыв добавлен', reviews: perfume.reviews });
  } catch (err) {
    console.error('Ошибка при добавлении отзыва:', err);
    res.status(500).json({ message: (err as Error).message });
  }
};
export const addCategoryRatings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { perfume_id } = req.params;
    const { userId, smell, longevity, sillage, bottle, priceValue } = req.body;

    // Найти парфюм по его ID
    const perfume = await Perfume.findOne({ perfume_id });
    if (!perfume) {
      res.status(404).json({ message: 'Парфюм не найден' });
      return;
    }

    // Проверить, оценивал ли этот пользователь уже данный парфюм
    if (perfume.user_ratings.some(rating => rating.userId.toString() === userId)) {
      res.status(400).json({ message: 'Вы уже оценили этот парфюм' });
      return;
    }

    // Добавление новых оценок от пользователя
    perfume.user_ratings.push({ userId, smell, longevity, sillage, bottle, priceValue });

    // Обновить счетчик оценок
    perfume.rating_count += 1;

    // Пересчитать средние оценки для каждой категории
    const average = (arr: number[]) =>
      arr.reduce((sum, num) => sum + num, 0) / arr.length;

    const scentAvg = average(perfume.user_ratings.map(rating => rating.smell));
    const longevityAvg = average(perfume.user_ratings.map(rating => rating.longevity));
    const sillageAvg = average(perfume.user_ratings.map(rating => rating.sillage));
    const packagingAvg = average(perfume.user_ratings.map(rating => rating.bottle));
    const valueAvg = average(perfume.user_ratings.map(rating => rating.priceValue));

    // Обновить `rating_value` как среднее всех категорий, масштабированное на 2
    perfume.rating_value =
      ((scentAvg + longevityAvg + sillageAvg + packagingAvg + valueAvg) / 5) * 2;

    // Сохранить изменения
    await perfume.save();

    res.status(201).json({
      message: 'Оценки добавлены и общий рейтинг обновлен',
      rating_value: perfume.rating_value,
      rating_count: perfume.rating_count,
      averages: { scentAvg, longevityAvg, sillageAvg, packagingAvg, valueAvg },
    });
  } catch (err) {
    console.error('Ошибка при добавлении оценок по категориям:', err);
    res.status(500).json({ message: 'Ошибка при добавлении оценок по категориям' });
  }
};
export const getRecentReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ищем последние 9 отзывов по всем парфюмам, сортируя по дате создания
    const recentReviews = await Perfume.aggregate([
      { $unwind: '$reviews' }, // Разворачиваем массив отзывов
      { $sort: { 'reviews.createdAt': -1 } }, // Сортировка по дате создания отзыва
      { $limit: 9 }, // Ограничиваем до 9 отзывов
      {
        $lookup: {
          from: 'users', // Коллекция пользователей
          localField: 'reviews.userId', // Поле userId из отзыва
          foreignField: '_id', // Поле _id из коллекции пользователей
          as: 'user', // Название поля, куда будут помещены данные пользователя
        },
      },
      {
        $unwind: '$user', // Извлекаем единственного пользователя из массива
      },
      {
        $project: {
          _id: 0,
          perfume_id: 1, // ID парфюма
          main_image: 1, // Основное изображение парфюма
          'reviews.body': 1, // Текст отзыва
          'reviews.createdAt': 1, // Дата создания отзыва
          'user._id': 1, // ID пользователя (userId)
          'user.username': 1, // Никнейм пользователя
        },
      },
    ]);

    // Проверка на случай, если отзывы не найдены
    if (!recentReviews.length) {
      res.status(404).json({ message: 'Отзывы не найдены' });
      return;
    }

    res.json(recentReviews);
  } catch (err) {
    console.error('Ошибка при получении последних отзывов:', err);
    res.status(500).json({ message: 'Ошибка при получении последних отзывов' });
  }
};
