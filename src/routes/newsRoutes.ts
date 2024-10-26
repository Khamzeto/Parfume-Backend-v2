import { Router } from 'express';
import {
  createNewsRequest,
  getAllNewsRequests,
  deleteNewsRequest,
  getNewsRequestsByUserId,
  updateNewsRequest,
  addCommentToNews,
  deleteCommentFromNews,
  addReplyToComment,
  deleteReplyFromComment,
  makeNewsPopular,
  updatePopularityScore,
  removePopularity,
  getPopularNews,
  getNewsById,
  getLatestNews,
} from '../controllers/newsController'; // Импортируем контроллер новостей
import { checkRole } from '../middleware/roleMiddleware';

const router = Router();

// Перемещаем этот маршрут выше
router.get('/requests/id/:id', getNewsById); // Получение конкретной новости по id
// В newsRouter.ts
router.get('/latest', getLatestNews); // Маршрут для получения последних 9 новостей

// Создание заявки на добавление новости
router.post('/requests', checkRole(['admin', 'editor']), createNewsRequest);

// Получение всех новостей (с пагинацией и сортировкой)
router.get('/requests', getAllNewsRequests);

// Удаление новости
router.delete('/requests/:id', deleteNewsRequest);

// Получение всех новостей пользователя по userId
router.get('/requests/user/:userId', getNewsRequestsByUserId);

// Обновление новости
router.put('/requests/:id', updateNewsRequest);

// Получение всех популярных новостей
router.get('/popular', getPopularNews);

// Добавление комментария к новости
router.post('/requests/:id/comments', addCommentToNews);

// Удаление комментария из новости
router.delete('/requests/:id/comments/:commentId', deleteCommentFromNews);

// Добавление ответа на комментарий
router.post('/requests/:id/comments/:commentId/replies', addReplyToComment);

// Удаление ответа на комментарий
router.delete(
  '/requests/:id/comments/:commentId/replies/:replyId',
  deleteReplyFromComment
);

// Сделать новость популярной
router.post('/requests/:id/popular', makeNewsPopular);

// Обновление балла популярности новости
router.put('/requests/:id/popular', updatePopularityScore);

// Убрать популярность с новости
router.put('/requests/:id/unpopular', removePopularity);

export default router;
