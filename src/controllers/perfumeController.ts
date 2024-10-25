import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import Fuse from 'fuse.js';
import { transliterate as tr, slugify } from 'transliteration';
import axios from 'axios';

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
      page = 1,
      limit = 10,
      sortBy = 'relevance',
      gender,
      year,
      notes,
    } = req.query;

    // Нормализация и транслитерация запроса, если он присутствует
    let normalizedQuery = '';
    let transliteratedQuery = '';

    if (query && typeof query === 'string') {
      normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      transliteratedQuery = slugify(normalizedQuery.toLowerCase()); // Используем slugify напрямую
    }

    // Параметры пагинации
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Определение сортировки
    let sortCriteria: any = {};

    if (sortBy === 'popular') {
      sortCriteria = { rating_count: -1, rating_value: -1 };
    } else if (sortBy === 'unpopular') {
      sortCriteria = { rating_count: 1, rating_value: 1 };
    } else if (sortBy === 'newest') {
      sortCriteria = { release_year: -1 };
    } else {
      // По умолчанию сортировка по релевантности
      sortCriteria = {
        namePriority: -1,
        exactMatch: -1,
        lengthDifference: 1,
      };
    }

    // Фильтры
    const filters: any = {};

    // Создаем массив условий для $and
    const andConditions: any[] = [];

    // Фильтр по запросу (имя или бренд)
    if (query && typeof query === 'string') {
      andConditions.push({
        $or: [
          { name: { $regex: normalizedQuery, $options: 'i' } },
          { brand: { $regex: normalizedQuery, $options: 'i' } },
          { name: { $regex: transliteratedQuery, $options: 'i' } },
          { brand: { $regex: transliteratedQuery, $options: 'i' } },
          { name_ru: { $regex: query, $options: 'i' } },
          { brand_ru: { $regex: query, $options: 'i' } },
        ],
      });
    }

    // Фильтр по нотам
    if (notes) {
      let notesArray: string[] = [];
      if (typeof notes === 'string') {
        notesArray = notes.split(',').map(note => note.trim());
      } else if (Array.isArray(notes)) {
        notesArray = notes as string[];
      }

      andConditions.push({
        $or: [
          { 'notes.top_notes': { $in: notesArray } },
          { 'notes.heart_notes': { $in: notesArray } },
          { 'notes.base_notes': { $in: notesArray } },
          { 'notes.additional_notes': { $in: notesArray } },
        ],
      });
    }

    // Добавляем условия $and в фильтр, если они есть
    if (andConditions.length > 0) {
      filters.$and = andConditions;
    }

    // Фильтр по гендеру
    if (gender) {
      filters.gender = gender;
    }

    // Фильтр по году выпуска
    if (year) {
      filters.release_year = Number(year);
    }

    // Построение агрегационного пайплайна
    const pipeline: any[] = [
      { $match: filters },
      {
        $addFields: {
          rating_count: { $ifNull: ['$rating_count', 0] },
          rating_value: { $ifNull: ['$rating_value', 0] },
        },
      },
    ];

    // Сортировка
    if (sortBy === 'relevance' && query && typeof query === 'string') {
      pipeline.push(
        {
          $addFields: {
            exactMatch: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ['$name', normalizedQuery] },
                    { $eq: ['$brand', normalizedQuery] },
                    { $eq: ['$name', transliteratedQuery] },
                    { $eq: ['$brand', transliteratedQuery] },
                    { $eq: ['$name_ru', query] },
                    { $eq: ['$brand_ru', query] },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
            namePriority: {
              $cond: {
                if: {
                  $or: [
                    { $regexMatch: { input: '$name', regex: query, options: 'i' } },
                    { $regexMatch: { input: '$name_ru', regex: query, options: 'i' } },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
            lengthDifference: {
              $abs: { $subtract: [{ $strLenCP: '$name' }, normalizedQuery.length] },
            },
          },
        },
        { $sort: sortCriteria }
      );
    } else {
      pipeline.push({ $sort: sortCriteria });
    }

    // Пагинация
    pipeline.push({ $skip: skip }, { $limit: limitNumber });

    // Выполнение агрегационного пайплайна
    const perfumesFromDb = await Perfume.aggregate(pipeline);

    // Подсчет общего количества результатов для пагинации
    const totalResults = await Perfume.countDocuments(filters);
    const totalPages = Math.ceil(totalResults / limitNumber);

    // Ответ клиенту с результатами
    res.json({
      perfumes: perfumesFromDb,
      totalPages: totalPages,
      currentPage: pageNumber,
      totalResults: totalResults,
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
    const perfume = await Perfume.findOne({ perfume_id: req.params.perfume_id });
    if (!perfume) {
      res.status(404).json({ message: 'Perfume not founde' });
      return;
    }
    res.json(perfume);
  } catch (err) {
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
