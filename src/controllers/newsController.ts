import { Request, Response } from 'express';
import mongoose from 'mongoose';
import NewsRequest, { IComment } from '../models/newsModel'; // Модель и интерфейсы
import path from 'path';
import fs from 'fs';
// Создание новости
const saveBase64Image = (base64: string): string => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, ''); // Убираем префикс Base64
  const buffer = Buffer.from(base64Data, 'base64'); // Преобразуем в буфер

  const rootDir = path.resolve(__dirname, '..', '..'); // Корень проекта
  const uploadDir = path.join(rootDir, 'uploads', 'avatars'); // Путь к папке для изображений

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true }); // Создаем папку, если её нет
  }

  // Генерация уникального имени файла
  const uniquePrefix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const fileName = `${uniquePrefix}.jpg`; // Уникальное имя файла
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, buffer); // Сохраняем файл на диск

  return `/uploads/avatars/${fileName}`; // Относительный путь к файлу
};

// Обработчик создания новости
export const createNewsRequest = async (req: Request, res: Response): Promise<void> => {
  const { title, description, content, coverImage, userId } = req.body;

  if (!userId) {
    res.status(400).json({ message: 'Пользователь не найден.' });
    return;
  }

  try {
    // Сохраняем изображение, если оно передано
    let coverImagePath: string | undefined;
    if (coverImage && coverImage.startsWith('data:image/')) {
      coverImagePath = saveBase64Image(coverImage); // Используем функцию с уникальным именем
    }

    const newNewsRequest = new NewsRequest({
      title,
      description,
      content,
      coverImage: coverImagePath, // Сохраняем путь к изображению
      userId: new mongoose.Types.ObjectId(userId),
    });

    await newNewsRequest.save();
    res.status(201).json({
      message: 'Новость создана.',
      news: newNewsRequest, // Возвращаем созданную новость
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
      .select('-content') // Исключаем поле content
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
    // Получаем параметры запроса: skip
    const { skip = 0 } = req.query;

    // Преобразуем skip в число (на случай, если оно приходит как строка)
    const skipValue = parseInt(skip as string, 10) || 0;

    // Сортировка по убыванию даты создания, ограничение до 9 новостей, исключение поля content
    const latestNews = await NewsRequest.find()
      .sort({ createdAt: -1 })
      .skip(skipValue)
      .limit(9)
      .select('-content'); // Исключаем поле content

    res.json(latestNews);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении последних новостей.',
      error: (err as Error).message,
    });
  }
};

export const getAllComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1; // Номер страницы
    const limit = parseInt(req.query.limit as string, 10) || 20; // Лимит комментариев на странице
    const skip = (page - 1) * limit;

    // Агрегируем все комментарии с информацией о пользователях и пагинацией
    const allComments = await NewsRequest.aggregate([
      { $unwind: '$comments' }, // Разворачиваем массив комментариев
      {
        $lookup: {
          from: 'users', // Коллекция пользователей
          localField: 'comments.userId', // Поле userId из комментария
          foreignField: '_id', // Поле _id из коллекции пользователей
          as: 'user', // Название поля для данных пользователя
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true, // Сохраняем комментарии без пользователя
        },
      },
      { $sort: { 'comments.createdAt': -1 } }, // Сортировка по дате создания комментария
      { $skip: skip }, // Пропуск комментариев для пагинации
      { $limit: limit }, // Лимит комментариев на странице
      {
        $project: {
          _id: 0,
          news_id: '$_id', // ID новости
          title: 1, // Название новости
          'comments._id': 1, // ID комментария
          'comments.content': 1, // Текст комментария
          'comments.createdAt': 1, // Дата создания комментария
          'user._id': 1, // ID пользователя
          'user.username': 1, // Никнейм пользователя
        },
      },
    ]);

    // Подсчитываем общее количество комментариев для пагинации
    const totalComments = await NewsRequest.aggregate([
      { $unwind: '$comments' },
      { $count: 'total' },
    ]);

    const total = totalComments[0]?.total || 0;
    const pages = Math.ceil(total / limit);

    // Возвращаем комментарии и информацию о пагинации
    res.json({
      comments: allComments,
      total, // Общее количество комментариев
      page,
      pages, // Общее количество страниц
    });
  } catch (err) {
    console.error('Ошибка при получении всех комментариев:', err);
    res.status(500).json({ message: 'Ошибка при получении всех комментариев' });
  }
};
export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  const { commentId } = req.params;

  try {
    // Ищем новость, содержащую комментарий
    const news = await NewsRequest.findOne({
      'comments._id': new mongoose.Types.ObjectId(commentId),
    });

    if (!news) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    // Используем `.pull()` для удаления комментария по его ID
    news.comments.pull(new mongoose.Types.ObjectId(commentId));

    await news.save();

    res.json({ message: 'Комментарий удален.' });
  } catch (err) {
    console.error('Ошибка при удалении комментария:', err);
    res.status(500).json({ message: 'Ошибка при удалении комментария' });
  }
};
