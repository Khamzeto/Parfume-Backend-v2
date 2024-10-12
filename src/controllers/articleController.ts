import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ArticleRequest, { IComment } from '../models/articleModel'; // Модель и интерфейсы

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
      userId: new mongoose.Types.ObjectId(userId), // Приводим userId к ObjectId
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

    const requests = await ArticleRequest.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .skip(skip)
      .limit(limitNumber);

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

    const requests = await ArticleRequest.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'approved',
    })
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

// Добавление комментария к статье
export const addCommentToArticle = async (req: Request, res: Response): Promise<void> => {
  const { userId, username, avatar, content } = req.body;
  const { id } = req.params;

  if (!userId || !content) {
    res.status(400).json({ message: 'Пользователь и контент обязательны.' });
    return;
  }

  try {
    const article = await ArticleRequest.findById(id);

    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    // Создание нового комментария с типом IComment
    const newComment: IComment = {
      _id: new mongoose.Types.ObjectId(), // Генерация нового ObjectId
      userId: new mongoose.Types.ObjectId(userId), // Преобразование строки userId в ObjectId
      username,
      avatar,
      content,
      createdAt: new Date(),
      replies: [], // Пустой массив для ответов
    };

    // Добавление комментария к статье
    article.comments.push(newComment);
    await article.save();

    res.status(201).json({ message: 'Комментарий добавлен.' });
  } catch (err) {
    // Приводим err к типу Error
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res
      .status(500)
      .json({ message: 'Ошибка при добавлении комментария.', error: errorMessage });
  }
};

// Удаление комментария
export const deleteCommentFromArticle = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, commentId } = req.params;

  try {
    const article = await ArticleRequest.findById(id);

    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    // Приводим тип `_id` к `mongoose.Types.ObjectId`
    const commentIndex = article.comments.findIndex(
      c => (c._id as mongoose.Types.ObjectId).toString() === commentId
    );

    if (commentIndex === -1) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    article.comments.splice(commentIndex, 1);
    await article.save();

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
    const article = await ArticleRequest.findById(id);

    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    // Поиск комментария по ID
    const comment = article.comments.find(c => c._id.toString() === commentId);
    if (!comment) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    // Создание нового ответа на комментарий
    const newReply = {
      _id: new mongoose.Types.ObjectId(), // Генерация нового ObjectId для ответа
      userId: new mongoose.Types.ObjectId(userId), // Преобразование строки userId в ObjectId
      username,
      avatar,
      content,
      createdAt: new Date(),
    };

    // Добавление ответа в комментарий
    comment.replies.push(newReply);
    await article.save();

    res.status(201).json({ message: 'Ответ добавлен к комментарию.' });
  } catch (err) {
    // Приведение err к типу Error для правильной работы с ошибкой
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при добавлении ответа на комментарий.',
      error: errorMessage,
    });
  }
};

export const deleteReplyFromComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, commentId, replyId } = req.params;

  try {
    const article = await ArticleRequest.findById(id);

    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    const comment = article.comments.find(
      c => (c._id as mongoose.Types.ObjectId).toString() === commentId
    );
    if (!comment) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    // Приводим `_id` ответа к `mongoose.Types.ObjectId`
    const replyIndex = comment.replies.findIndex(
      r => (r._id as mongoose.Types.ObjectId).toString() === replyId
    );

    if (replyIndex === -1) {
      res.status(404).json({ message: 'Ответ не найден.' });
      return;
    }

    comment.replies.splice(replyIndex, 1);
    await article.save();

    res.json({ message: 'Ответ удален.' });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при удалении ответа на комментарий.',
      error: (err as Error).message,
    });
  }
};
