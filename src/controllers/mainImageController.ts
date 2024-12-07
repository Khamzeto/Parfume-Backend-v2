import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import MainImageRequest from '../models/mainImageRequestModel';
import path from 'path';
import fs from 'fs';

// Функция для сохранения изображения в файловую систему

// Создание заявки на изменение главного изображения
export const createMainImageRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { perfumeId, image, userId } = req.body;

  if (!userId) {
    console.log('Пользователь не найден');
    res.status(400).json({ message: 'Пользователь не найден.' });
    return;
  }

  console.log('Поступил запрос на создание заявки на изменение главного изображения: ', {
    perfumeId,
    userId,
    image,
  });

  try {
    // Создаем заявку, сохраняем изображение в base64
    const newMainImageRequest = new MainImageRequest({
      perfumeId,
      userId,
      image,
      status: 'pending',
    });

    await newMainImageRequest.save();
    console.log('Заявка успешно создана:', newMainImageRequest);

    res.status(201).json({
      message:
        'Заявка на изменение главного изображения создана и отправлена на рассмотрение.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    console.error('Ошибка при создании заявки:', errorMessage);
    res.status(500).json({
      message: 'Ошибка при создании заявки на изменение главного изображения.',
      error: errorMessage,
    });
  }
};

// Остальные контроллеры остаются без изменений

export const approveMainImageRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await MainImageRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return; // Return after sending response
    }

    // Проверка формата base64
    const matches = request.image.match(/^data:image\/([a-zA-Z0-9]+);base64,([^\"]+)$/);
    if (!matches || matches.length < 3) {
      res.status(400).json({ message: 'Неверный формат изображения (base64).' });
      return; // Return after sending response
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');

    // Генерация уникального имени файла
    const filename = `${Date.now()}.jpg`;

    // Путь для сохранения изображения
    const imagePath = path.join(
      '/var/www/www-root/data/www/parfumetrika.ru/images',
      filename
    );

    // Проверка на пустое изображение
    if (imageBuffer.length === 0) {
      res.status(400).json({ message: 'Изображение пустое после декодирования base64.' });
      return; // Return after sending response
    }

    // Сохранение изображения
    fs.writeFileSync(imagePath, imageBuffer);

    // Обновляем путь к изображению в базе данных
    const perfume = await Perfume.findById(request.perfumeId);
    if (!perfume) {
      res.status(404).json({ message: 'Парфюм не найден.' });
      return; // Return after sending response
    }

    perfume.main_image = `images/${filename}`;
    await perfume.save();

    // Обновляем статус заявки
    request.status = 'approved';
    await request.save();

    res.json({ message: 'Заявка одобрена, изображение загружено.' });
  } catch (err) {
    console.error('Ошибка при одобрении заявки:', err);
    res.status(500).json({
      message: 'Ошибка при одобрении заявки на изменение главного изображения.',
      error: err instanceof Error ? err.message : 'Неизвестная ошибка',
    });
  }
};

// Отклонение заявки на изменение главного изображения
export const rejectMainImageRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await MainImageRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Заявка отклонена.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при отклонении заявки на изменение главного изображения.',
    });
  }
};
export const getAllMainImageRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const requests = await MainImageRequest.find()
      .populate('perfumeId')
      .skip(skip)
      .limit(limitNumber);

    const totalRequests = await MainImageRequest.countDocuments();

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении заявок на изменение главного изображения.',
      error: (err as Error).message,
    });
  }
};

// Удаление заявки на изменение главного изображения
export const deleteMainImageRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await MainImageRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    res.json({ message: 'Заявка удалена.' });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Ошибка при удалении заявки на изменение главного изображения.' });
  }
};

// Получение заявок на изменение главного изображения по userId
export const getMainImageRequestsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.params.userId;

  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const requests = await MainImageRequest.find({ userId })
      .populate('perfumeId')
      .skip(skip)
      .limit(limitNumber);

    const totalRequests = await MainImageRequest.countDocuments({ userId });

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message:
        'Ошибка при получении заявок на изменение главного изображения для данного пользователя.',
      error: (err as Error).message,
    });
  }
};
