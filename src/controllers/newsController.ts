import { Request, Response } from 'express';
import mongoose from 'mongoose';
import NewsRequest, { IComment } from '../models/newsModel'; // Модель и интерфейсы

// Создание новости
export const createNewsRequest = async (req: Request, res: Response): Promise<void> => {
  const { title, description, content, coverImage, userId } = req.body;

  if (!userId) {
    res.status(400).json({ message: 'Пользователь не найден.' });
    return;
  }

  try {
    const newNewsRequest = new NewsRequest({
      title,
      description,
      content,
      coverImage,
      userId: new mongoose.Types.ObjectId(userId),
    });

    await newNewsRequest.save();
    res.status(201).json({
      message: 'Новость создана.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при создании новости.',
      error: errorMessage,
    });
  }
};

// Получение всех новостей
export const getAllNewsRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const sortByField = typeof sortBy === 'string' ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;

    const requests = await NewsRequest.find()
      .populate('userId')
      .sort({ [sortByField]: sortOrder })
      .skip(skip)
      .limit(limitNumber);

    const totalRequests = await NewsRequest.countDocuments();

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении новостей.',
      error: (err as Error).message,
    });
  }
};

// Удаление новости
export const deleteNewsRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await NewsRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    res.json({ message: 'Новость удалена.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при удалении новости.',
      error: (err as Error).message,
    });
  }
};

// Получение новостей по userId
export const getNewsRequestsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.params.userId;

  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const requests = await NewsRequest.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .skip(skip)
      .limit(limitNumber);

    const totalRequests = await NewsRequest.countDocuments({ userId });

    res.json({
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
      totalRequests,
      requests,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении новостей для данного пользователя.',
      error: (err as Error).message,
    });
  }
};

// Обновление новости
export const updateNewsRequest = async (req: Request, res: Response): Promise<void> => {
  const { title, description, content, coverImage } = req.body;

  try {
    const request = await NewsRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    request.title = title || request.title;
    request.description = description || request.description;
    request.content = content || request.content;
    request.coverImage = coverImage || request.coverImage;

    await request.save();

    res.json({ message: 'Новость обновлена.' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при обновлении новости.',
      error: errorMessage,
    });
  }
};

// Добавление комментария к новости
export const addCommentToNews = async (req: Request, res: Response): Promise<void> => {
  const { userId, username, avatar, content } = req.body;
  const { id } = req.params;

  if (!userId || !content) {
    res.status(400).json({ message: 'Пользователь и контент обязательны.' });
    return;
  }

  try {
    const news = await NewsRequest.findById(id);

    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    const newComment: IComment = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(userId),
      username,
      avatar,
      content,
      createdAt: new Date(),
      replies: [],
    };

    news.comments.push(newComment);
    await news.save();

    res.status(201).json({ message: 'Комментарий добавлен.' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res
      .status(500)
      .json({ message: 'Ошибка при добавлении комментария.', error: errorMessage });
  }
};

// Удаление комментария
export const deleteCommentFromNews = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, commentId } = req.params;

  try {
    const news = await NewsRequest.findById(id);

    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    const commentIndex = news.comments.findIndex(
      c => (c._id as mongoose.Types.ObjectId).toString() === commentId
    );

    if (commentIndex === -1) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    news.comments.splice(commentIndex, 1);
    await news.save();

    res.json({ message: 'Комментарий удален.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при удалении комментария.',
      error: (err as Error).message,
    });
  }
};

// Добавление ответа на комментарий
export const addReplyToComment = async (req: Request, res: Response): Promise<void> => {
  const { userId, username, avatar, content } = req.body;
  const { id, commentId } = req.params;

  if (!userId || !content) {
    res.status(400).json({ message: 'Пользователь и контент обязательны.' });
    return;
  }

  try {
    const news = await NewsRequest.findById(id);

    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    const comment = news.comments.find(c => c._id.toString() === commentId);
    if (!comment) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    const newReply = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(userId),
      username,
      avatar,
      content,
      createdAt: new Date(),
    };

    comment.replies.push(newReply);
    await news.save();

    res.status(201).json({ message: 'Ответ добавлен к комментарию.' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при добавлении ответа на комментарий.',
      error: errorMessage,
    });
  }
};

// Удаление ответа на комментарий
export const deleteReplyFromComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, commentId, replyId } = req.params;

  try {
    const news = await NewsRequest.findById(id);

    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    const comment = news.comments.find(
      c => (c._id as mongoose.Types.ObjectId).toString() === commentId
    );
    if (!comment) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    const replyIndex = comment.replies.findIndex(
      r => (r._id as mongoose.Types.ObjectId).toString() === replyId
    );

    if (replyIndex === -1) {
      res.status(404).json({ message: 'Ответ не найден.' });
      return;
    }

    comment.replies.splice(replyIndex, 1);
    await news.save();

    res.json({ message: 'Ответ удален.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при удалении ответа на комментарий.',
      error: (err as Error).message,
    });
  }
};

// Сделать новость популярной
export const makeNewsPopular = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { score } = req.body;

  try {
    const news = await NewsRequest.findById(id);
    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    news.isPopular = true;
    news.popularityScore = score;
    await news.save();

    res.json({ message: 'Новость сделана популярной с баллом популярности.', news });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при установке популярности новости.',
      error: (err as Error).message,
    });
  }
};

// Обновление балла популярности новости
export const updatePopularityScore = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { score } = req.body;

  try {
    const news = await NewsRequest.findById(id);
    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    news.popularityScore = score;
    await news.save();

    res.json({ message: 'Балл популярности обновлен.', news });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при обновлении балла популярности новости.',
      error: (err as Error).message,
    });
  }
};

// Убрать популярность с новости
export const removePopularity = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const news = await NewsRequest.findById(id);
    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    news.isPopular = false;
    news.popularityScore = 0;
    await news.save();

    res.json({ message: 'Популярность новости убрана.', news });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при удалении популярности новости.',
      error: (err as Error).message,
    });
  }
};

// Получить все популярные новости
export const getPopularNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const popularNews = await NewsRequest.find({ isPopular: true })
      .sort({ popularityScore: -1 })
      .exec();

    res.json(popularNews);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении популярных новостей.',
      error: (err as Error).message,
    });
  }
};
// Получение конкретной новости по ID
export const getNewsById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const news = await NewsRequest.findById(id);

    if (!news) {
      res.status(404).json({ message: 'Новость не найдена.' });
      return;
    }

    res.json(news);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении новости.',
      error: (err as Error).message,
    });
  }
};
// Получение последних 9 новостей по createdAt
export const getLatestNews = async (req: Request, res: Response): Promise<void> => {
  try {
    // Сортировка по убыванию даты создания и ограничение до 9 новостей
    const latestNews = await NewsRequest.find().sort({ createdAt: -1 }).limit(9);

    res.json(latestNews);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении последних новостей.',
      error: (err as Error).message,
    });
  }
};
