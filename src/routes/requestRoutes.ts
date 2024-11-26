import express from 'express';
import {
  createRequest,
  getAllRequests,
  approveRequest,
  rejectRequest,
  deleteRequest,
  getApprovedRequestsByUserId,
  deleteAllRequests,
} from '../controllers/requestController'; // Подключаем контроллер заявок

const router = express.Router();

// POST /requests — создание заявки
router.post('/', createRequest);

// GET /requests — получение всех заявок
router.get('/', getAllRequests);

// PUT /requests/approve/:id — одобрение заявки
router.put('/approve/:id', approveRequest);

// PUT /requests/reject/:id — отклонение заявки
router.put('/reject/:id', rejectRequest);
router.get('/user/:userId', getApprovedRequestsByUserId);

// DELETE /requests/:id — удаление заявки
router.delete('/:id', deleteRequest);
// DELETE /requests — удаление всех заявок
router.delete('/', deleteAllRequests);

export default router;
