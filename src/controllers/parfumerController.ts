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
    // Получаем уникальных парфюмеров на английском и русском языках из коллекции Perfume
    const parfumersEn: string[] = await perfumeModel.distinct('perfumers_en');
    const parfumersRu: string[] = await perfumeModel.distinct('perfumers'); // Получаем на русском

    // Создаем объект для сопоставления парфюмеров на английском языке с их русскими эквивалентами
    const parfumerMap: Record<string, { en: string; ru: string }> = {};

    // Заполняем объект английскими именами, проверяем, что имя не пустое
    parfumersEn.forEach((en) => {
      if (en && typeof en === 'string') {
        const slugEn = slugify(en);
        parfumerMap[slugEn] = { en: en, ru: '' };
      }
    });

    // Для каждого парфюмера на русском пытаемся найти соответствие в объекте и добавляем русское имя
    parfumersRu.forEach((ru, index) => {
      if (ru && typeof ru === 'string' && parfumersEn[index]) {
        const slugEn = slugify(parfumersEn[index]);
        if (parfumerMap[slugEn]) {
          parfumerMap[slugEn].ru = ru; // если найдено соответствие, добавляем русское имя
        }
      }
    });

    // Преобразуем объект обратно в массив для ответа
    const combinedParfumers = Object.values(parfumerMap);

    if (combinedParfumers.length === 0) {
      res.status(404).json({ message: 'No parfumers found' });
      return;
    }

    // Сохраняем каждого парфюмера в коллекцию Parfumer, если он еще не существует
    await Promise.all(
      combinedParfumers.map(async (parfumerObj) => {
        try {
          await parfumerModel.updateOne(
            { slug: slugify(parfumerObj.en) }, // ищем по slug на основе английского имени
            { $setOnInsert: parfumerObj }, // если не существует, создаем
            { upsert: true } // если не найдено, создаем
          );
        } catch (error) {
          console.error('Error inserting parfumer:', error);
        }
      })
    );

    // Возвращаем парфюмеров с их slug
    res.json(combinedParfumers);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};





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


  
  export const getPerfumesByParfumer = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy as string || 'relevance'; // Default sorting is by relevance
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
        .sort(sortCriteria) // Применение сортировки
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
        count: perfumes.length  // Выводим количество парфюмов на текущей странице
      });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  };
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
  export const updateParfumer = async (req: Request, res: Response): Promise<void> => {
    const { parfumerId } = req.params;  // Получаем ID парфюмера из параметров
    const { newName, newSlug } = req.body;  // Получаем новые данные из тела запроса

    try {
        // Находим парфюмера по его ID
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

        // Если имя изменилось, обновляем его в коллекции духов (в поле `perfumers`)
        if (oldName !== newName) {
            console.log('Обновляем парфюмера в парфюмах с', oldName, 'на', newName);

            const updateResult = await perfumeModel.updateMany(
                {
                    'perfumers': oldName
                },
                {
                    $set: {
                        'perfumers.$[perfumerElem]': newName,
                    },
                },
                {
                    arrayFilters: [
                        { 'perfumerElem': oldName }
                    ],
                    multi: true // Обновляем все документы, которые содержат старого парфюмера
                }
            );

            console.log('Результат обновления парфюмов:', updateResult);
        }

        // Возвращаем успешный ответ
        res.status(200).json({
            message: `Парфюмер '${oldName}' успешно обновлён на '${newName}'`,
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
      const result = await perfumeModel.deleteMany({ perfumers_en: parfumerRecord.original });
  
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
  
      // Проверка и приведение query к строке (если это массив или другая структура)
      if (Array.isArray(query)) {
        query = query[0]; // Если это массив, используем первый элемент
      }
  
      if (typeof query !== 'string') {
        query = ''; // Если query всё ещё не строка, установим его в пустую строку
      }
  
      // Параметры пагинации
      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      const skip = (pageNumber - 1) * limitNumber;
  
      // Нормализация и транслитерация запроса
      const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Нормализация
      const transliteratedQuery = tr(normalizedQuery.toLowerCase()); // Транслитерация
  
      // Фильтры для поиска парфюмеров
      const filters: any = {};
  
      if (query) {
        filters.$or = [
          { original: { $regex: normalizedQuery, $options: 'i' } }, // Поиск по имени на латинице
          { original: { $regex: transliteratedQuery, $options: 'i' } }, // Поиск по транслитерированному имени
        ];
      }
  
      // Если query пусто, просто выводим всех парфюмеров
      const parfumersFromDb = await parfumerModel
        .find(filters)
        .skip(skip)
        .limit(limitNumber);
  
      // Если результаты отсутствуют
      if (parfumersFromDb.length === 0) {
        res.status(404).json({ message: 'Parfumers not found' });
        return;
      }
  
      // Подсчет общего количества результатов для пагинации
      const totalResults = await parfumerModel.countDocuments(filters);
      const totalPages = Math.ceil(totalResults / limitNumber);
  
      // Ответ клиенту с результатами
      res.json({
        parfumers: parfumersFromDb,
        totalPages: totalPages,
        currentPage: pageNumber,
        totalResults: totalResults,
      });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  };
  
  
  // Добавляем функцию получения парфюмера по его ID
export const getParfumerById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;  // Получаем ID парфюмера из параметров

  try {
    // Ищем парфюмера в коллекции по ID
    const parfumer = await parfumerModel.findById(id);

    if (!parfumer) {
      res.status(404).json({ message: 'Parfumer not found' });
      return;
    }

    // Возвращаем найденного парфюмера
    res.json(parfumer);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
