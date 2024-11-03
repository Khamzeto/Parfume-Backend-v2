import { Router } from 'express';
import {
  createArticleRequest,
  getAllArticleRequests,
  approveArticleRequest,
  rejectArticleRequest,
  deleteArticleRequest,
  getArticleRequestsByUserId,
  updateArticleRequest,
  getApprovedArticleRequestsByUserId,
  getArticleRequestById,
  addCommentToArticle, // Контроллер для добавления комментария
  deleteCommentFromArticle, // Контроллер для удаления комментария
  addReplyToComment, // Контроллер для добавления ответа на комментарий
  deleteReplyFromComment,
  makeArticlePopular,
  updatePopularityScore,
  removePopularity,
  getPopularArticles,
  getLatestArticles,
  getAllComments,
  deleteComment, // Контроллер для удаления ответа на комментарий
} from '../controllers/articleController'; // Импорт контроллеров

const router = Router();

// Создание заявки на добавление статьи
router.post('/requests', createArticleRequest);
// В articlesRouter.ts
router.get('/latest', getLatestArticles); // Маршрут для получения последних 9 статей

// Получение всех заявок на статьи (с пагинацией)
router.get('/requests', getAllArticleRequests);

// Одобрение заявки на статью
router.put('/requests/approve/:id', approveArticleRequest);

// Отклонение заявки на статью
router.put('/requests/reject/:id', rejectArticleRequest);

// Удаление заявки на статью
router.delete('/requests/:id', deleteArticleRequest);

// Получение заявок на статьи по userId
router.get('/requests/user/:userId', getArticleRequestsByUserId);
router.get('/requests/user/:userId/approved', getApprovedArticleRequestsByUserId);

// Обновление заявки на статью
router.put('/requests/:id', updateArticleRequest);

// Получение заявки на статью по id
router.get('/requests/id/:id', getArticleRequestById);

// Добавление комментария к статье
router.post('/requests/:id/comments', addCommentToArticle);

// Удаление комментария
router.delete('/requests/:id/comments/:commentId', deleteCommentFromArticle);

// Добавление ответа на комментарий
router.post('/requests/:id/comments/:commentId/replies', addReplyToComment);

// Удаление ответа на комментарий
router.delete(
  '/requests/:id/comments/:commentId/replies/:replyId',
  deleteReplyFromComment
);
router.post('/requests/:id/popular', makeArticlePopular);

// Обновить балл популярности
router.put('/requests/:id/popular', updatePopularityScore);

// Убрать популярность
router.put('/requests/:id/unpopular', removePopularity);

// Получить все популярные статьи
router.get('/requests/popular', getPopularArticles);
router.get('/comments/all', getAllComments);

// Удаление комментария по его ID
router.delete('/comments/:commentId', deleteComment);
export default router;
