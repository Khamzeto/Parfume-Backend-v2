import { Request, Response } from 'express';
import perfumeModel from '../models/perfumeModel';
import parfumerModel from '../models/parfumerModel';
import { slugify } from '../utils/slugify';
import Perfume from '../models/perfumeModel';
import { transliterate as tr } from 'transliteration';

interface Parfumer {
  en: string;
  ru: string;
  slug: string;
}

// Получение всех парфюмеров
// Получение всех парфюмеров
export const getAllParfumers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Получаем уникальных парфюмеров из коллекции Perfume на английском и русском языках
    const parfumersEn: string[] = await perfumeModel.distinct('perfumers_en');
    const parfumersRu: string[] = await perfumeModel.distinct('perfumers');

    // Объединяем их в один массив объектов
    const allParfumers: Parfumer[] = parfumersEn.map((parfumerEn, index) => ({
      en: parfumerEn,
      ru: parfumersRu[index] || '', // Связываем с русским именем, если оно существует
      slug: slugify(parfumerEn) // Генерируем slug на основе английской версии
    }));

    // Сохраняем каждого парфюмера в коллекцию Parfumer, если он еще не существует
    await Promise.all(
      allParfumers.map(async (parfumerObj) => {
        try {
          await parfumerModel.updateOne(
            { slug: parfumerObj.slug }, // критерий поиска
            { $setOnInsert: parfumerObj }, // данные для вставки, если не найдено совпадений
            { upsert: true } // создает документ, если не найдено совпадений
          );
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Error inserting parfumer: ${error.message}`);
          } else {
            console.error('An unknown error occurred while inserting parfumer.');
          }
        }
      })
    );

    // Возвращаем парфюмеров с их slug
    res.json(allParfumers);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};



// Получение парфюмеров по первой букве
export const getParfumersByInitial = async (req: Request, res: Response): Promise<void> => {
  try {
    const initial = req.params.initial.toUpperCase(); // Преобразуем букву в верхний регистр

    // Получаем парфюмеров, которые начинаются на указанную букву
    const parfumers = await parfumerModel.find({ original: { $regex: `^${initial}`, $options: 'i' } });

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

// Получение парфюмов по парфюмеру
export const getPerfumesByParfumer = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy as string || 'relevance'; // Default sorting is by relevance

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

    // Фильтр духов по парфюмеру
    const filters: any = {
      perfumers: { $regex: `^${parfumer}$`, $options: 'i' }, // Поиск парфюмов по парфюмеру
    };

    // Установка сортировки
    let sortCriteria: any = {};
    if (sortBy === 'A-Z') {
      sortCriteria = { name: 1 }; // Сортировка по названию духов от A до Z
    } else if (sortBy === 'Z-A') {
      sortCriteria = { name: -1 }; // Сортировка по названию духов от Z до A
    } else if (sortBy === 'popular') {
      sortCriteria = { rating_count: -1, rating_value: -1 }; // Сортировка по популярности
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

    res.json({
      parfumer,
      perfumes,
      total: totalPerfumes,
      count: perfumes.length // Выводим количество парфюмов на текущей странице
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

// Добавление нового парфюмера
export const addParfumer = async (req: Request, res: Response): Promise<void> => {
  const { original } = req.body; // Получаем имя парфюмера из тела запроса

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
    const newParfumer = new parfumerModel({ original, slug });
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

// Обновление парфюмера
export const updateParfumer = async (req: Request, res: Response): Promise<void> => {
  const { parfumerId } = req.params;  // Получаем ID парфюмера из параметров
  const { newName, newSlug } = req.body;  // Получаем новые данные из тела запроса

  try {
    const existingParfumer = await parfumerModel.findById(parfumerId);

    if (!existingParfumer) {
      res.status(404).json({ message: 'Парфюмер не найден' });
      return;
    }

    const oldName = existingParfumer.original;  // Сохраняем старое имя парфюмера

    // Обновляем имя и slug, если новые данные переданы
    existingParfumer.original = newName || existingParfumer.original;
    existingParfumer.slug = slugify(newSlug || newName || existingParfumer.original);

    // Сохраняем обновлённого парфюмера
    const updatedParfumer = await existingParfumer.save();

    // Если имя изменилось, обновляем его в коллекции духов
    if (oldName !== newName) {
      const updateResult = await perfumeModel.updateMany(
        { 'perfumers': oldName },
        { $set: { 'perfumers.$[perfumerElem]': newName } },
        { arrayFilters: [{ 'perfumerElem': oldName }], multi: true }
      );
      console.log('Результат обновления парфюмов:', updateResult);
    }

    res.status(200).json({
      message: `Парфюмер '${oldName}' успешно обновлён на '${newName}'`,
      updatedParfumer,
    });
  } catch (err) {
    console.error('Ошибка при обновлении парфюмера:', err);
    res.status(500).json({ message: 'Не удалось обновить парфюмера', error: err });
  }
};

// Удаление парфюмера по ID
export const deleteParfumerById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const parfumerRecord = await parfumerModel.findByIdAndDelete(id);

    if (!parfumerRecord) {
      res.status(404).json({ message: 'Parfumer not found' });
      return;
    }

    const result = await perfumeModel.deleteMany({ perfumers: parfumerRecord.original });

    res.status(200).json({
      message: `Parfumer '${parfumerRecord.original}' and ${result.deletedCount} perfumes deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

// Поиск парфюмеров
// Поиск парфюмеров
export const searchParfumers = async (req: Request, res: Response): Promise<void> => {
  try {
    let { query = '', page = 1, limit = 10 } = req.query;

    if (Array.isArray(query)) {
      query = query[0];
    }

    if (typeof query !== 'string') {
      query = '';
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Нормализация и транслитерация запроса
    const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Нормализация
    const transliteratedQuery = tr(normalizedQuery.toLowerCase()); // Транслитерация

    const filters: any = {};

    if (query) {
      filters.$or = [
        { original: { $regex: normalizedQuery, $options: 'i' } },  // Поиск по латинице
        { original: { $regex: transliteratedQuery, $options: 'i' } },  // Поиск по транслитерации латиницы
        { original: { $regex: query, $options: 'i' } },  // Поиск по русским словам напрямую
        { original: { $regex: tr(query), $options: 'i' } },  // Транслитерация русского запроса
      ];
    }

    // Выполнение поиска парфюмеров в базе данных
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

    // Возвращаем результаты поиска
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


// Получение парфюмера по ID
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

