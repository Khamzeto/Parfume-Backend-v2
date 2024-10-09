import { Router } from 'express';
import {
  createGalleryRequest,
  getAllGalleryRequests,
  approveGalleryRequest,
  rejectGalleryRequest,
  deleteGalleryRequest,
  getGalleryRequestsByUserId,
} from '../controllers/galleryController';

const router = Router();

// Роуты для работы с заявками на фото
router.post('/gallery-requests', createGalleryRequest); // Создать заявку
router.get('/gallery-requests', getAllGalleryRequests);
router.get('/gallery-requests/user/:userId', getGalleryRequestsByUserId); // Получить все заявки
router.post('/gallery-requests/approve/:id', approveGalleryRequest); // Одобрить заявку
router.post('/gallery-requests/reject/:id', rejectGalleryRequest); // Отклонить заявку
router.delete('/gallery-requests/:id', deleteGalleryRequest); // Удалить заявку

export default router;
