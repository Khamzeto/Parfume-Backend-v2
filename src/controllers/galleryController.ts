import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import GalleryRequest from '../models/galleryModel'; // Модель заявки на фото
import mongoose from 'mongoose';

// Создание заявки на добавление фото
export const createGalleryRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { perfumeId, images, userId } = req.body;

  if (!userId) {
    console.log('Пользователь не найден');
    res.status(400).json({ message: 'Пользователь не найден.' });
    return;
  }

  console.log('Поступил запрос на создание заявки: ', { perfumeId, userId, images });

  try {
    const newGalleryRequest = new GalleryRequest({
      perfumeId,
      userId,
      images,
      status: 'pending',
    });

    await newGalleryRequest.save();
    console.log('Заявка успешно создана:', newGalleryRequest);

    res.status(201).json({
      message: 'Заявка на добавление фото создана и отправлена на рассмотрение.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    console.error('Ошибка при создании заявки:', errorMessage);
    res
      .status(500)
      .json({ message: 'Ошибка при создании заявки на фото.', error: errorMessage });
  }
};

// Получение всех заявок на добавление фото
export const getAllGalleryRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query; // Извлекаем параметры из запроса, используем значения по умолчанию

    const pageNumber = Number(page); // Преобразуем номер страницы в число
    const limitNumber = Number(limit); // Преобразуем количество элементов в число
    const skip = (pageNumber - 1) * limitNumber; // Рассчитываем сколько записей нужно пропустить

    // Получаем заявки с учетом пагинации
    const requests = await GalleryRequest.find()
      .populate('perfumeId')
      .skip(skip)
      .limit(limitNumber);

    // Получаем общее количество заявок для пагинации
    const totalRequests = await GalleryRequest.countDocuments();

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении заявок на фото.',
      error: (err as Error).message,
    });
  }
};

// Одобрение заявки на добавление фото
export const approveGalleryRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const request = await GalleryRequest.findById(req.params.id).session(session);
    if (!request) {
      throw new Error('Заявка не найдена.');
    }

    const perfume = await Perfume.findById(request.perfumeId).session(session);
    if (!perfume) {
      throw new Error('Парфюм не найден.');
    }

    if (!request.images || request.images.length === 0) {
      throw new Error('Нет изображений для добавления.');
    }

    if (!perfume.gallery_images) {
      perfume.gallery_images = [];
    }

    // Добавляем изображения без дубликатов
    perfume.gallery_images = Array.from(
      new Set([...perfume.gallery_images, ...request.images])
    );
    await perfume.save({ session });

    request.status = 'approved';
    await request.save({ session });

    await session.commitTransaction();
    res.json({ message: 'Заявка одобрена и изображения добавлены в галерею парфюма.' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({
      message: 'Ошибка при одобрении заявки на фото.',
      error: (err as Error).message,
    });
  } finally {
    session.endSession();
  }
};

// Отклонение заявки на добавление фото
export const rejectGalleryRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await GalleryRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Заявка отклонена.' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при отклонении заявки на фото.' });
  }
};

// Удаление заявки на добавление фото
export const deleteGalleryRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await GalleryRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    res.json({ message: 'Заявка удалена.' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении заявки на фото.' });
  }
};

export const getGalleryRequestsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.params.userId; // Получаем ID пользователя из параметров запроса

  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Находим все заявки, сделанные пользователем с данным userId
    const requests = await GalleryRequest.find({ userId })
      .populate('perfumeId')
      .skip(skip)
      .limit(limitNumber);

    const totalRequests = await GalleryRequest.countDocuments({ userId });

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении заявок на фото для данного пользователя.',
      error: (err as Error).message,
    });
  }
};
