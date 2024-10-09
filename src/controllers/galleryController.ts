import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import GalleryRequest from '../models/galleryModel'; // Модель заявки на фото

// Создание заявки на добавление фото
export const createGalleryRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { perfumeId, images } = req.body;

  // Приведение типа user с указанием наличия _id
  const userId = (req.user as { _id: string })._id;

  if (!userId) {
    res.status(400).json({ message: 'Пользователь не найден.' });
    return;
  }

  try {
    const newGalleryRequest = new GalleryRequest({
      perfumeId,
      userId, // Добавляем ID пользователя
      images,
      status: 'pending',
    });

    await newGalleryRequest.save();
    res.status(201).json({
      message: 'Заявка на добавление фото создана и отправлена на рассмотрение.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
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
  try {
    const request = await GalleryRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    // Добавляем изображения из заявки в парфюм
    const perfume = await Perfume.findById(request.perfumeId);
    if (!perfume) {
      res.status(404).json({ message: 'Парфюм не найден.' });
      return;
    }

    // Обновляем галерею парфюма
    perfume.gallery_images = [...perfume.gallery_images, ...request.images];
    await perfume.save();

    // Обновляем статус заявки
    request.status = 'approved';
    await request.save();

    res.json({ message: 'Заявка одобрена и изображения добавлены в галерею парфюма.' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при одобрении заявки на фото.' });
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
