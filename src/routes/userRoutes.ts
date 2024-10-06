// routes/userRoutes.ts

import express from 'express';
import {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/authController';

const router = express.Router();

// Получение всех пользователей
router.get('/', getUsers);

// Получение одного пользователя по id
router.get('/:id', getUserById);

// Обновление пользователя
router.put('/:id', updateUser);

// Удаление пользователя
router.delete('/:id', deleteUser);

export default router;
