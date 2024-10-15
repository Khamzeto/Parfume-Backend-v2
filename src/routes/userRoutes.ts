import express from 'express';
import {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  addToWishlist,
  removeFromWishlist,
  addToCollection,
  removeFromCollection,
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

// Добавление парфюма в коллекцию
router.post('/collection/:id', addToCollection);

// Удаление парфюма из коллекции
router.delete('/collection/:id', removeFromCollection);

// Добавление парфюма в список "Я хочу"
router.post('/wishlist/:id', addToWishlist);

// Удаление парфюма из списка "Я хочу"
router.delete('/wishlist/:id', removeFromWishlist);

export default router;
