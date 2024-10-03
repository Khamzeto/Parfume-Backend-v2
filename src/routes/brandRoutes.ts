// /src/routes/brandRoutes.ts
import express from 'express';
import {
  getAllBrands,
  getPerfumesByBrand,
  getBrandsByInitial,
  updateBrand,
  deleteBrandById,
} from '../controllers/brandController';
import { searchBrands } from '../controllers/perfumeController';

const router = express.Router();

// Маршрут для получения всех уникальных брендов
router.get('/brands', getAllBrands);

router.get('/searchBrands', searchBrands);
router.get('/:brand', getPerfumesByBrand);
router.get('/perfumes', getPerfumesByBrand);

// Маршрут для получения брендов по первой букве
router.get('/initial/:initial', getBrandsByInitial);
router.put('/brands/:brandId', updateBrand);

// Маршрут для удаления бренда
router.delete('/brands/:brandId', deleteBrandById);

export default router;
