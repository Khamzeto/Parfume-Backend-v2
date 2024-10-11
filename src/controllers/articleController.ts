import { Request, Response } from 'express';
import ArticleRequest from '../models/articleModel'; // Модель заявки на статью

// Создание заявки на добавление статьи
export const createArticleRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, description, content, coverImage, userId } = req.body;

  if (!userId) {
    res.status(400).json({ message: 'Пользователь не найден.' });
    return;
  }

  try {
    const newArticleRequest = new ArticleRequest({
      title,
      description,
      content,
      coverImage, // Сохраняем обложку статьи
      userId,
      status: 'pending', // Устанавливаем статус на 'pending' при создании
    });

    await newArticleRequest.save();
    res.status(201).json({
      message: 'Заявка на добавление статьи создана и отправлена на рассмотрение.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при создании заявки на статью.',
      error: errorMessage,
    });
  }
};

// Получение всех заявок на добавление статьи
export const getAllArticleRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const requests = await ArticleRequest.find()
      .populate('userId')
      .skip(skip)
      .limit(limitNumber);

    const totalRequests = await ArticleRequest.countDocuments();

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении заявок на статьи.',
      error: (err as Error).message,
    });
  }
};

// Одобрение заявки на статью
export const approveArticleRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await ArticleRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    request.status = 'approved';
    await request.save();

    res.json({ message: 'Заявка одобрена и статья опубликована.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при одобрении заявки на статью.',
      error: (err as Error).message,
    });
  }
};

// Отклонение заявки на статью
export const rejectArticleRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await ArticleRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Заявка отклонена.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при отклонении заявки на статью.',
      error: (err as Error).message,
    });
  }
};

// Удаление заявки на статью
export const deleteArticleRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await ArticleRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    res.json({ message: 'Заявка удалена.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при удалении заявки на статью.',
      error: (err as Error).message,
    });
  }
};

// Получение заявок на статьи по userId
export const getArticleRequestsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.params.userId; // Получаем ID пользователя из параметров запроса

  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const requests = await ArticleRequest.find({ userId }).skip(skip).limit(limitNumber);

    const totalRequests = await ArticleRequest.countDocuments({ userId });

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении заявок на статьи для данного пользователя.',
      error: (err as Error).message,
    });
  }
};

// Обновление заявки на статью
export const updateArticleRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, description, content, coverImage } = req.body;

  try {
    const request = await ArticleRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    // Обновляем поля заявки и изменяем статус на 'pending' при обновлении
    request.title = title || request.title;
    request.description = description || request.description;
    request.content = content || request.content;
    request.coverImage = coverImage || request.coverImage;
    request.status = 'pending'; // Снова устанавливаем статус на 'pending'

    await request.save();

    res.json({ message: 'Заявка обновлена.' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при обновлении заявки на статью.',
      error: errorMessage,
    });
  }
};

// Получение всех одобренных заявок на статьи по userId
export const getApprovedArticleRequestsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.params.userId; // Получаем ID пользователя из параметров запроса

  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Находим заявки пользователя, которые были одобрены
    const requests = await ArticleRequest.find({ userId, status: 'approved' })
      .skip(skip)
      .limit(limitNumber);

    const totalRequests = await ArticleRequest.countDocuments({
      userId,
      status: 'approved',
    });

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message:
        'Ошибка при получении одобренных заявок на статьи для данного пользователя.',
      error: (err as Error).message,
    });
  }
};

// Получение заявки на статью по id
export const getArticleRequestById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const request = await ArticleRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении заявки на статью.',
      error: (err as Error).message,
    });
  }
};
