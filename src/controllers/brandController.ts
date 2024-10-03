// /src/controllers/brandController.ts
import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import Brand from '../models/brandModel'; // Импорт модели Brand
import { slugify } from '../utils/slugify'; // Импорт функции slugify
import { transliterate as tr } from 'transliteration'; // Импорт функции транслитерации

// Получение всех уникальных брендов и сохранение в коллекцию брендов
export const getAllBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    // Получаем уникальные бренды из коллекции Perfume
    const brands = await Perfume.distinct('brand');

    if (brands.length === 0) {
      res.status(404).json({ message: 'No brands found' });
      return;
    }

    // Создаем массив объектов брендов с оригинальным названием и slug
    const brandsWithSlugs = brands.map(brand => ({
      original: brand,
      slug: slugify(brand),
    }));

    // Сохраняем каждый бренд в коллекцию Brand, если он еще не существует
    await Promise.all(
      brandsWithSlugs.map(async brandObj => {
        try {
          // Попробуйте сохранить бренд, если он еще не существует
          await Brand.updateOne(
            { slug: brandObj.slug }, // критерий поиска
            { $setOnInsert: brandObj }, // данные для вставки, если не найдено совпадений
            { upsert: true } // создает документ, если не найдено совпадений
          );
        } catch (error) {
          // Используем проверку типа или приведение к типу Error
          if (error instanceof Error) {
            console.error(`Error inserting brand: ${error.message}`);
          } else {
            console.error('An unknown error occurred while inserting brand.');
          }
        }
      })
    );

    // Возвращаем бренды с их slug
    res.json(brandsWithSlugs);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
// Получение духов по бренду с использованием slug
export const getPerfumesByBrand = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const sortBy = (req.query.sortBy as string) || 'relevance'; // Default sorting is by relevance
  const gender = req.query.gender as string; // Gender filter (optional)

  try {
    const encodedSlug = req.query.slug as string; // Получить закодированный slug бренда из параметра запроса
    if (!encodedSlug) {
      res.status(400).json({ message: 'Brand slug is required' });
      return;
    }

    const slug = decodeURIComponent(encodedSlug); // Декодируем slug бренда

    // Ищем бренд в коллекции Brand по slug
    const brandRecord = await Brand.findOne({ slug });

    if (!brandRecord) {
      res.status(404).json({ message: 'Brand not found' });
      return;
    }

    const brand = brandRecord.original; // Получаем оригинальное название бренда

    // Фильтр духов по гендеру (если указан)
    const filters: any = {
      brand: { $regex: `^${brand}$`, $options: 'i' },
    };

    if (gender) {
      filters.gender = gender;
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
    const perfumes = await Perfume.find(filters)
      .sort(sortCriteria) // Применение сортировки
      .skip(skip)
      .limit(limit);

    const totalPerfumes = await Perfume.countDocuments(filters);

    if (perfumes.length === 0) {
      res.status(404).json({ message: 'No perfumes found for this brand' });
      return;
    }

    // Возвращаем духи, имя бренда и общее количество духов
    res.json({
      brandName: brand, // Название бренда
      perfumes,
      total: totalPerfumes, // Общее количество духов для этого бренда
      count: perfumes.length, // Количество парфюмов на текущей странице
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

// Получение брендов по первой букве из коллекции Brand
export const getBrandsByInitial = async (req: Request, res: Response): Promise<void> => {
  try {
    const initial = req.params.initial.toUpperCase(); // Преобразуем букву в верхний регистр

    // Получаем бренды, которые начинаются на указанную букву из коллекции Brand
    const brands = await Brand.find({
      original: { $regex: `^${initial}`, $options: 'i' },
    });

    if (brands.length === 0) {
      res.status(404).json({ message: `No brands found starting with ${initial}` });
      return;
    }

    // Возвращаем бренды
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
// Обновление бренда по ID
export const updateBrand = async (req: Request, res: Response): Promise<void> => {
  const { brandId } = req.params; // Получаем ID бренда из параметров
  const { newName, newSlug } = req.body; // Получаем новые данные из тела запроса

  try {
    // Находим бренд по его ID
    const existingBrand = await Brand.findById(brandId);

    if (!existingBrand) {
      res.status(404).json({ message: 'Бренд не найден' });
      return;
    }

    const oldName = existingBrand.original; // Сохраняем старое имя бренда

    // Обновляем имя и slug, если новые данные переданы
    existingBrand.original = newName || existingBrand.original;
    existingBrand.slug = newSlug
      ? slugify(newSlug)
      : slugify(newName || existingBrand.original);

    // Сохраняем обновлённый бренд
    const updatedBrand = await existingBrand.save();

    // Обновляем бренд в коллекции духов
    if (oldName !== newName) {
      console.log(`Обновляем бренд в духах с ${oldName} на ${newName}`);

      await Perfume.updateMany({ brand: oldName }, { $set: { brand: newName } });
    }

    // Возвращаем успешный ответ
    res.status(200).json({
      message: `Бренд '${oldName}' успешно обновлён на '${newName}'`,
      updatedBrand,
    });
  } catch (err) {
    console.error('Ошибка при обновлении бренда:', err);
    res.status(500).json({ message: 'Не удалось обновить бренд', error: err });
  }
};
// Удаление бренда по ID
export const deleteBrandById = async (req: Request, res: Response): Promise<void> => {
  const { brandId } = req.params;

  try {
    // Поиск бренда по ID
    const brandRecord = await Brand.findByIdAndDelete(brandId);

    if (!brandRecord) {
      res.status(404).json({ message: 'Бренд не найден' });
      return;
    }

    // Удаление всех духов, связанных с этим брендом
    const result = await Perfume.deleteMany({ brand: brandRecord.original });

    res.status(200).json({
      message: `Бренд '${brandRecord.original}' и ${result.deletedCount} духов удалены успешно`,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
export const searchBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    let { query = '', page = 1, limit = 10 } = req.query;

    // Проверка и приведение типов данных
    if (Array.isArray(query)) query = query[0];
    if (typeof query !== 'string') query = '';

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Транслитерация и нормализация запроса
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const transliteratedQuery = tr(normalizedQuery.toLowerCase());

    // Фильтры для поиска брендов
    const filters: any = {};

    if (query) {
      filters.$or = [
        { original: { $regex: normalizedQuery, $options: 'i' } }, // Поиск по нормализованному запросу
        { original: { $regex: transliteratedQuery, $options: 'i' } }, // Поиск по транслитерированному запросу
      ];
    }

    // Поиск брендов в базе данных с пагинацией
    const brandsFromDb = await Brand.find(filters).skip(skip).limit(limitNumber);

    // Проверка на наличие брендов
    if (brandsFromDb.length === 0) {
      res.status(404).json({ message: 'Brands not found' });
      return;
    }

    // Подсчет общего количества результатов
    const totalResults = await Brand.countDocuments(filters);
    const totalPages = Math.ceil(totalResults / limitNumber);

    // Возвращаем найденные бренды и данные пагинации
    res.json({
      brands: brandsFromDb,
      totalPages,
      currentPage: pageNumber,
      totalResults,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
// Получение бренда по ID
export const getBrandById = async (req: Request, res: Response): Promise<void> => {
  const { brandId } = req.params; // Получаем ID бренда из параметров

  try {
    // Ищем бренд по его ID
    const brand = await Brand.findById(brandId);

    if (!brand) {
      res.status(404).json({ message: 'Бренд не найден' });
      return;
    }

    // Возвращаем бренд
    res.json(brand);
  } catch (err) {
    console.error('Ошибка при получении бренда по ID:', err);
    res.status(500).json({ message: (err as Error).message });
  }
};
