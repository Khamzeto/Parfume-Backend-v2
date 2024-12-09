// routes/mainImageRoutes.ts

import { Router } from 'express';
import {
  createMainImageRequest,
  getAllMainImageRequests,
  approveMainImageRequest,
  rejectMainImageRequest,
  deleteMainImageRequest,
  getMainImageRequestsByUserId,
} from '../controllers/mainImageController';

const router = Router();

// Создание заявки на изменение главного изображения
router.post('/requests', createMainImageRequest);

// Получение всех заявок на изменение главного изображения
router.get('/requests', getAllMainImageRequests);

// Одобрение заявки на изменение главного изображения
router.put('/requests/approve/:id', approveMainImageRequest);

// Отклонение заявки на изменение главного изображения
router.put('/requests/reject/:id', rejectMainImageRequest);

// Удаление заявки на изменение главного изображения
router.delete('/requests/:id', deleteMainImageRequest);

// Получение заявок на изменение главного изображения по userId
router.get('/requests/user/:userId', getMainImageRequestsByUserId);

export default router;
