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
} from '../controllers/newsController'; // Импортируем контроллер новостей

const router = Router();

// Создание заявки на добавление новости
router.post('/requests', createNewsRequest);

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

// Получение конкретной новости по id
router.get('/requests/id/:id', getAllNewsRequests);

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
