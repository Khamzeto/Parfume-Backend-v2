// routes/shopRoutes.ts
import express from 'express';
import {
  getAllShops,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
} from '../controllers/shopController';

const router = express.Router();

router.get('/', getAllShops); // Получить все магазины
router.get('/:id', getShopById); // Получить магазин по ID
router.post('/', createShop); // Создать новый магазин
router.put('/:id', updateShop); // Обновить магазин по ID
router.delete('/:id', deleteShop); // Удалить магазин по ID

export default router;
