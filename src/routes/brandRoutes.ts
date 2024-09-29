// /src/routes/brandRoutes.ts
import express from 'express';
import { getAllBrands, getPerfumesByBrand, getBrandsByInitial } from '../controllers/brandController';

const router = express.Router();

// Маршрут для получения всех уникальных брендов
router.get('/', getAllBrands);

// Маршрут для получения парфюмов по бренду
router.get('/:brand', getPerfumesByBrand);
router.get('/perfumes', getPerfumesByBrand);

// Маршрут для получения брендов по первой букве
router.get('/initial/:initial', getBrandsByInitial);

export default router;
