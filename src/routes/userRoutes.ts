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
router.get('/total-users', getTotalUsers);

// Маршрут для получения количества пользователей по месяцам
router.get('/users-by-month', getUsersByMonth);
// Удаление парфюма из коллекции
router.delete('/collection/:id', removeFromCollection);

// Добавление парфюма в список "Я хочу"
router.post('/wishlist/:id', addToWishlist);

// Удаление парфюма из списка "Я хочу"
router.delete('/wishlist/:id', removeFromWishlist);
router.get('/:userId/wishlist', getUserWishlist);
router.get('/:userId/collection', getUserPerfumeCollection);
router.put('/:userId/change-password', changePassword);
router.get('/:userId/collections', getUserCollections);

export default router;
