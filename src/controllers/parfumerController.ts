import { Request, Response } from 'express';
import perfumeModel from '../models/perfumeModel';
import parfumerModel from '../models/parfumerModel';
import { slugify } from '../utils/slugify';
import Perfume from '../models/perfumeModel';
import { transliterate as tr } from 'transliteration';

interface Parfumer {
  original: string;
  slug: string;
}
export const getAllParfumers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Получаем уникальные английские и русские имена парфюмеров
    const parfumersEn: string[] = await perfumeModel.distinct('perfumers_en');
    const parfumersRuMap: Record<string, string> = {}; // Словарь для хранения сопоставлений { англ. имя: русское имя }

    // Получаем все документы с полями perfumers и perfumers_en
    const parfumersRuData = await perfumeModel.find(
      {},
      { perfumers: 1, perfumers_en: 1 }
    );

    // Обрабатываем каждый документ, содержащий англ. и рус. имена парфюмеров
    parfumersRuData.forEach(doc => {
      if (Array.isArray(doc.perfumers_en) && Array.isArray(doc.perfumers)) {
        doc.perfumers_en.forEach((enName, index) => {
          const ruName = doc.perfumers[index] || ''; // Берем соответствующее русское имя, если оно есть
          parfumersRuMap[enName] = ruName; // Сопоставляем англ. имя с русским
        });
      }
    });

    // Формируем массив с объектами парфюмеров
    const combinedParfumers = parfumersEn.map(en => {
      const ru = parfumersRuMap[en] || ''; // Ищем соответствующее русское имя, если его нет — пустая строка
      return {
        original: en, // Английское имя
        original_ru: ru, // Русское имя
        slug: slugify(en), // Создаем slug на основе английского имени
      };
    });

    if (combinedParfumers.length === 0) {
      res.status(404).json({ message: 'No parfumers found' });
      return;
    }

    // Сохраняем каждого парфюмера в коллекцию Parfumer, если он еще не существует
    await Promise.all(
      combinedParfumers.map(async parfumerObj => {
        try {
          await parfumerModel.updateOne(
            { slug: parfumerObj.slug }, // ищем по slug
            { $setOnInsert: parfumerObj }, // если не существует, вставляем новый документ
            { upsert: true } // создаем документ, если не найдено совпадений
          );
        } catch (error) {
          console.error('Error inserting parfumer:', error);
        }
      })
    );

    // Возвращаем результат
    res.json(combinedParfumers);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getParfumersByInitial = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const initial = req.params.initial.toUpperCase(); // Преобразуем букву в верхний регистр

    // Получаем парфюмеров, которые начинаются на указанную букву в англ. или рус. имени
    const parfumers = await parfumerModel.find({
      $or: [
        { original: { $regex: `^${initial}`, $options: 'i' } }, // Поиск по английскому имени
        { original_ru: { $regex: `^${initial}`, $options: 'i' } }, // Поиск по русскому имени
      ],
    });

    if (parfumers.length === 0) {
      res.status(404).json({ message: `No parfumers found starting with ${initial}` });
      return;
    }

    // Возвращаем парфюмеров
    res.json(parfumers);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getPerfumesByParfumer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const sortBy = (req.query.sortBy as string) || 'relevance'; // Default sorting is by relevance
  const gender = req.query.gender as string; // Gender filter (optional)

  try {
    const encodedSlug = req.query.slug as string; // Получить закодированный slug парфюмера из параметра запроса
    if (!encodedSlug) {
      res.status(400).json({ message: 'Parfumer slug is required' });
      return;
    }

    const slug = decodeURIComponent(encodedSlug); // Декодируем slug парфюмера

    // Ищем парфюмера в коллекции Parfumer по slug
    const parfumerRecord = await parfumerModel.findOne({ slug });

    if (!parfumerRecord) {
      res.status(404).json({ message: 'Parfumer not found' });
      return;
    }

    const parfumer = parfumerRecord.original; // Получаем оригинальное имя парфюмера

    // Фильтр духов по гендеру (если указан)
    const filters: any = {
      perfumers_en: { $regex: `^${parfumer}$`, $options: 'i' }, // Поиск парфюмов по парфюмеру
    };

    if (gender) {
      filters.gender = gender; // Добавляем фильтр по гендеру, если он указан
    }

    // Установка сортировки
    let sortCriteria: any = {};

    if (sortBy === 'A-Z') {
      sortCriteria = { name: 1 }; // Сортировка по названию духов от A до Z
    } else if (sortBy === 'Z-A') {
      sortCriteria = { name: -1 }; // Сортировка по названию духов от Z до A
    } else if (sortBy === 'popular') {
      sortCriteria = { rating_count: -1, rating_value: -1 }; // Сортировка по количеству отзывов и рейтингу по убыванию
    } else if (sortBy === 'unpopular') {
      sortCriteria = { rating_count: 1, rating_value: 1 }; // Сортировка по количеству отзывов и рейтингу по возрастанию
    }

    // Поиск духов
    const perfumes = await perfumeModel
      .find(filters)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

    const totalPerfumes = await perfumeModel.countDocuments(filters);

    if (perfumes.length === 0) {
      res.status(404).json({ message: 'No perfumes found for this parfumer' });
      return;
    }

    // Возвращаем духи, имя парфюмера и общее количество духов
    res.json({
      parfumer,
      perfumes,
      total: totalPerfumes,
      count: perfumes.length, // Выводим количество парфюмов на текущей странице
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const addParfumer = async (req: Request, res: Response): Promise<void> => {
  const { original, original_ru } = req.body; // Получаем имя парфюмера и русское имя из тела запроса

  try {
    if (!original || typeof original !== 'string') {
      res.status(400).json({ message: 'Имя парфюмера обязательно' });
      return;
    }

    // Проверяем, существует ли парфюмер с таким именем
    const existingParfumer = await parfumerModel.findOne({ original });
    if (existingParfumer) {
      res.status(400).json({ message: 'Такой парфюмер уже существует' });
      return;
    }

    // Создаём slug для парфюмера
    const slug = slugify(original);

    // Сохраняем нового парфюмера в базе данных
    const newParfumer = new parfumerModel({ original, original_ru, slug });
    await newParfumer.save();

    res.status(201).json({
      message: 'Парфюмер успешно добавлен',
      parfumer: newParfumer,
    });
  } catch (err) {
    console.error('Ошибка при добавлении парфюмера:', err);
    res.status(500).json({ message: 'Не удалось добавить парфюмера', error: err });
  }
};

export const updateParfumer = async (req: Request, res: Response): Promise<void> => {
  const { parfumerId } = req.params; // Получаем ID парфюмера из параметров
  const { newName, newRuName } = req.body; // Получаем новые данные из тела запроса

  try {
    // Находим парфюмера по его ID
    const existingParfumer = await parfumerModel.findById(parfumerId);

    if (!existingParfumer) {
      res.status(404).json({ message: 'Парфюмер не найден' });
      return;
    }

    const oldName = existingParfumer.original; // Сохраняем старое имя парфюмера
    const oldRuName = existingParfumer.original_ru; // Сохраняем старое русское имя

    // Обновляем только измененные поля
    if (newName) {
      existingParfumer.original = newName;
    }

    if (newRuName) {
      existingParfumer.original_ru = newRuName;
    }

    // Сохраняем обновлённого парфюмера
    const updatedParfumer = await existingParfumer.save();

    // Обновляем конкретное имя парфюмера в массиве у духов
    const updateResult = await perfumeModel.updateMany(
      {
        // Ищем парфюмы, где старое имя парфюмера присутствует
        $or: [
          { perfumers_en: oldName }, // В массиве английских имен парфюмеров
          { perfumers: oldRuName }, // В массиве русских имен парфюмеров
        ],
      },
      {
        // Обновляем только изменённые имена в массиве
        $set: {
          'perfumers_en.$[elem]': newName || oldName, // Обновляем английское имя, если оно изменилось
          'perfumers.$[elem]': newRuName || oldRuName, // Обновляем русское имя, если оно изменилось
        },
      },
      {
        arrayFilters: [
          { elem: oldName }, // Для английского имени
          { elem: oldRuName }, // Для русского имени
        ],
        multi: true, // Обновляем все документы, содержащие старого парфюмера
      }
    );

    console.log('Результат обновления парфюмов:', updateResult);

    // Возвращаем успешный ответ
    res.status(200).json({
      message: `Парфюмер успешно обновлён`,
      updatedParfumer,
    });
  } catch (err) {
    console.error('Ошибка при обновлении парфюмера:', err);
    res.status(500).json({ message: 'Не удалось обновить парфюмера', error: err });
  }
};

export const deleteParfumerById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Поиск парфюмера по ID
    const parfumerRecord = await parfumerModel.findByIdAndDelete(id);

    if (!parfumerRecord) {
      res.status(404).json({ message: 'Parfumer not found' });
      return;
    }

    // Удаление всех духов, связанных с этим парфюмером
    const result = await perfumeModel.deleteMany({
      perfumers_en: parfumerRecord.original,
    });

    res.status(200).json({
      message: `Parfumer '${parfumerRecord.original}' and ${result.deletedCount} perfumes deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const searchParfumers = async (req: Request, res: Response): Promise<void> => {
  try {
    let { query = '', page = 1, limit = 10 } = req.query;

    if (Array.isArray(query)) query = query[0];
    if (typeof query !== 'string') query = '';

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Транслитерация и нормализация
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const transliteratedQuery = tr(normalizedQuery.toLowerCase());

    // Фильтры для поиска
    const filters: any = {};

    if (query) {
      filters.$or = [
        { original: { $regex: normalizedQuery, $options: 'i' } },
        { original_ru: { $regex: transliteratedQuery, $options: 'i' } },
      ];
    }

    const parfumersFromDb = await parfumerModel
      .find(filters)
      .skip(skip)
      .limit(limitNumber);

    if (parfumersFromDb.length === 0) {
      res.status(404).json({ message: 'Parfumers not found' });
      return;
    }

    const totalResults = await parfumerModel.countDocuments(filters);
    const totalPages = Math.ceil(totalResults / limitNumber);

    res.json({
      parfumers: parfumersFromDb,
      totalPages,
      currentPage: pageNumber,
      totalResults,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getParfumerById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const parfumer = await parfumerModel.findById(id);

    if (!parfumer) {
      res.status(404).json({ message: 'Parfumer not found' });
      return;
    }

    res.json(parfumer);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
