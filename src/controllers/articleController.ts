import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ArticleRequest, { IComment } from '../models/articleModel'; // Модель и интерфейсы
import userModel, { IUser } from '../models/userModel';
import sharp from 'sharp';
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
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Приведение sortBy к строке
    const sortByField = typeof sortBy === 'string' ? sortBy : 'createdAt';

    // Определение порядка сортировки
    const sortOrder = order === 'asc' ? 1 : -1;

    const requests = await ArticleRequest.find()
      .populate('userId')
      .sort({ [sortByField]: sortOrder }) // Убедимся, что sortByField — это строка
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
    // Находим статью по ID
    const request = await ArticleRequest.findById(req.params.id);

    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    // Получаем `userId` из статьи и находим данные пользователя отдельно
    const user = await userModel
      .findById(request.userId)
      .select('username avatar isVerified');

    // Добавляем данные пользователя к ответу, если пользователь найден
    const response = {
      ...request.toObject(), // Преобразуем статью в обычный объект
      user: user || null, // Добавляем данные пользователя или `null`, если не найден
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении заявки на статью.',
      error: err instanceof Error ? err.message : 'Неизвестная ошибка',
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
// Сделать статью популярной и установить балл популярности
export const makeArticlePopular = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { score } = req.body;

  try {
    const article = await ArticleRequest.findById(id);
    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    article.isPopular = true;
    article.popularityScore = score;
    await article.save();

    res.json({ message: 'Статья сделана популярной с баллом популярности.', article });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при установке популярности статьи.',
      error: (err as Error).message,
    });
  }
};
// Изменение балла популярности статьи
export const updatePopularityScore = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { score } = req.body;

  try {
    const article = await ArticleRequest.findById(id);
    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    article.popularityScore = score;
    await article.save();

    res.json({ message: 'Балл популярности обновлен.', article });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при обновлении балла популярности статьи.',
      error: (err as Error).message,
    });
  }
};
// Убрать популярность со статьи
export const removePopularity = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const article = await ArticleRequest.findById(id);
    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    article.isPopular = false;
    article.popularityScore = 0;
    await article.save();

    res.json({ message: 'Популярность статьи убрана.', article });
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при удалении популярности статьи.',
      error: (err as Error).message,
    });
  }
};
// Получить все популярные статьи, отсортированные по баллу популярности
export const getPopularArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const popularArticles = await ArticleRequest.find({ isPopular: true })
      .sort({ popularityScore: -1 }) // Сортировка по баллу популярности по убыванию
      .exec();

    res.json(popularArticles);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении популярных статей.',
      error: (err as Error).message,
    });
  }
};
// Получение последних 9 статей по дате создания
const compressBase64Image = async (base64Image: string): Promise<string> => {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, ''); // Удаляем префикс Base64
  const buffer = Buffer.from(base64Data, 'base64'); // Преобразуем Base64 в буфер

  const compressedBuffer = await sharp(buffer)
    .toFormat('jpeg', { quality: 70 }) // Сжимаем до 70% качества
    .toBuffer();

  return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`; // Возвращаем сжатое изображение в Base64
};

export const getLatestArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Находим последние статьи без поля "content"
    const latestArticles = await ArticleRequest.find()
      .sort({ createdAt: -1 })
      .limit(9)
      .select('title description coverImage createdAt userId') // Исключаем content
      .populate<{ userId: IUser }>('userId', 'username avatar'); // Подтягиваем username и avatar пользователя

    // Обрабатываем аватары
    const articlesWithCompressedAvatars = await Promise.all(
      latestArticles.map(async article => {
        const user = article.userId;
        if (typeof user === 'object' && 'avatar' in user && user.avatar) {
          const compressedAvatar = await compressBase64Image(user.avatar); // Сжимаем аватар
          return {
            ...article.toObject(),
            userId: {
              ...user,
              avatar: compressedAvatar, // Заменяем аватар на сжатую версию
            },
          };
        }
        return article.toObject();
      })
    );

    // Возвращаем результат
    res.json(articlesWithCompressedAvatars);
  } catch (err) {
    res.status(500).json({
      message: 'Ошибка при получении последних статей.',
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
    const allComments = await ArticleRequest.aggregate([
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
          article_id: '$_id', // ID статьи
          title: 1, // Название статьи
          'comments._id': 1, // ID комментария
          'comments.content': 1, // Текст комментария
          'comments.createdAt': 1, // Дата создания комментария
          'user._id': 1, // ID пользователя
          'user.username': 1, // Никнейм пользователя
          'user.avatar': 1, // Аватар пользователя (если есть)
        },
      },
    ]);

    // Подсчитываем общее количество комментариев для пагинации
    const totalCommentsResult = await ArticleRequest.aggregate([
      { $unwind: '$comments' },
      { $count: 'total' },
    ]);

    const total = totalCommentsResult[0]?.total || 0;
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
    // Ищем статью, содержащую комментарий
    const article = await ArticleRequest.findOne({
      'comments._id': new mongoose.Types.ObjectId(commentId),
    });

    if (!article) {
      res.status(404).json({ message: 'Комментарий не найден.' });
      return;
    }

    // Используем `.pull()` для удаления комментария по его ID
    article.comments.pull(new mongoose.Types.ObjectId(commentId));

    await article.save();

    res.json({ message: 'Комментарий удален.' });
  } catch (err) {
    console.error('Ошибка при удалении комментария:', err);
    res.status(500).json({ message: 'Ошибка при удалении комментария' });
  }
};
// Удаление статьи
export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const article = await ArticleRequest.findByIdAndDelete(id);
    if (!article) {
      res.status(404).json({ message: 'Статья не найдена.' });
      return;
    }

    res.json({ message: 'Статья успешно удалена.' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при удалении статьи.',
      error: errorMessage,
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

    // Обновляем поля заявки
    request.title = title || request.title;
    request.description = description || request.description;
    request.content = content || request.content;
    request.coverImage = coverImage || request.coverImage;
    request.status = 'pending'; // Снова устанавливаем статус на 'pending'

    await request.save();

    res.json({ message: 'Заявка обновлена.', request });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
    res.status(500).json({
      message: 'Ошибка при обновлении заявки на статью.',
      error: errorMessage,
    });
  }
};
