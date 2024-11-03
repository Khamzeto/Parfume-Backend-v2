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
  getUserCollections,
  getUserWishlist,
  getUserPerfumeCollection,
  changePassword,
  getTotalUsers,
  getUsersByMonth,
} from '../controllers/authController';

const router = express.Router();

// Маршрут для получения общего количества пользователей
router.get('/total-users', getTotalUsers);

// Маршрут для получения количества пользователей по месяцам
router.get('/users-by-month', getUsersByMonth);

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

// Получение списка "Я хочу" пользователя
router.get('/:userId/wishlist', getUserWishlist);

// Получение коллекции парфюмов пользователя
router.get('/:userId/collection', getUserPerfumeCollection);

// Изменение пароля пользователя
router.put('/:userId/change-password', changePassword);

// Получение коллекций пользователя
router.get('/:userId/collections', getUserCollections);

export default router;
