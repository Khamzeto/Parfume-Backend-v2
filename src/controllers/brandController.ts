// /src/controllers/brandController.ts
import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import Brand from '../models/brandModel'; // Импорт модели Brand
import { slugify } from '../utils/slugify'; // Импорт функции slugify

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
    const brandsWithSlugs = brands.map((brand) => ({
      original: brand,
      slug: slugify(brand),
    }));

    // Сохраняем каждый бренд в коллекцию Brand, если он еще не существует
    await Promise.all(
      brandsWithSlugs.map(async (brandObj) => {
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
  const sortBy = req.query.sortBy as string || 'relevance'; // Default sorting is by relevance
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
    const brands = await Brand.find({ original: { $regex: `^${initial}`, $options: 'i' } });

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
