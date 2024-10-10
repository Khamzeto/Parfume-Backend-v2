import { Router } from 'express';
import {
  createArticleRequest,
  getAllArticleRequests,
  approveArticleRequest,
  rejectArticleRequest,
  deleteArticleRequest,
  getArticleRequestsByUserId,
} from '../controllers/articleController'; // Импорт контроллеров

const router = Router();

// Создание заявки на добавление статьи
router.post('/requests', createArticleRequest);

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

export default router;
