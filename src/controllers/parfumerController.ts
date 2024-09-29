import { Request, Response } from 'express';
import perfumeModel from '../models/perfumeModel';
import parfumerModel from '../models/parfumerModel';
import { slugify } from '../utils/slugify';
import Perfume from '../models/perfumeModel';

interface Parfumer {
  original: string;
  slug: string;
}

export const getAllParfumers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Получаем уникальных парфюмеров из коллекции Perfume
    const parfumers: string[] = await perfumeModel.distinct('perfumers_en');

    if (parfumers.length === 0) {
      res.status(404).json({ message: 'No parfumers found' });
      return;
    }

    // Создаем массив объектов парфюмеров с оригинальным именем и slug
    const parfumersWithSlugs: Parfumer[] = parfumers.map((parfumer) => ({
      original: parfumer,
      slug: slugify(parfumer),
    }));

    // Сохраняем каждого парфюмера в коллекцию Parfumer, если он еще не существует
    await Promise.all(
      parfumersWithSlugs.map(async (parfumerObj) => {
        try {
          // Попробуйте сохранить парфюмера, если он еще не существует
          await parfumerModel.updateOne(
            { slug: parfumerObj.slug }, // критерий поиска
            { $setOnInsert: parfumerObj }, // данные для вставки, если не найдено совпадений
            { upsert: true } // создает документ, если не найдено совпадений
          );
        } catch (error) {
          // Используем проверку типа или приведение к типу Error
          if (error instanceof Error) {
            console.error(`Error inserting parfumer: ${error.message}`);
          } else {
            console.error('An unknown error occurred while inserting parfumer.');
          }
        }
      })
    );

    // Возвращаем парфюмеров с их slug
    res.json(parfumersWithSlugs);
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
  