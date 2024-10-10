import { Request, Response } from 'express';
import ArticleRequest from '../models/articleModel'; // Модель заявки на статью

// Создание заявки на добавление статьи
export const createArticleRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, description, content, userId } = req.body;

  if (!userId) {
    console.log('Пользователь не найден');
    res.status(400).json({ message: 'Пользователь не найден.' });
    return;
  }

  console.log('Поступил запрос на создание заявки: ', {
    title,
    description,
    content,
    userId,
  });

  try {
    const newArticleRequest = new ArticleRequest({
      title,
      description,
      content,
      userId,
      status: 'pending',
    });

    await newArticleRequest.save();
    console.log('Заявка успешно создана:', newArticleRequest);

    res.status(201).json({
      message: 'Заявка на добавление статьи создана и отправлена на рассмотрение.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    console.error('Ошибка при создании заявки:', errorMessage);
    res
      .status(500)
      .json({ message: 'Ошибка при создании заявки на статью.', error: errorMessage });
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
    res.status(500).json({ message: 'Ошибка при одобрении заявки на статью.' });
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
    res.status(500).json({ message: 'Ошибка при отклонении заявки на статью.' });
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
    res.status(500).json({ message: 'Ошибка при удалении заявки на статью.' });
  }
};

// Получение заявок на статьи по userId
export const getArticleRequestsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.params.userId; // Получаем ID пользователя из параметров запроса

  try {
    const { page = 1, limit = 10 } = req.query; // Параметры для пагинации

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Получаем заявки пользователя с пагинацией
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
