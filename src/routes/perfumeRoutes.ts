import express from 'express';
import {
  getPerfumeById,
  getAllPerfumes,
  createPerfume,
  updatePerfume,
  deletePerfume,
  searchPerfumes,
  translateAndUpdateAllFields,
  searchBrands,
  uploadGalleryImages,
  getGalleryImages,
  getPerfumesByIds,
  getPerfumesWithSimilarAndSearch,
  getRecentPerfumes,
} from '../controllers/perfumeController';

const router = express.Router();

// Определяем конкретные маршруты в начале
router.get('/search', searchPerfumes); // Поиск парфюмов
router.get('/searchBrands', searchBrands); // Поиск брендов
router.get('/similar', getPerfumesWithSimilarAndSearch); // Поиск похожих парфюмов
router.get('/recent', getRecentPerfumes); // Получение последних парфюмов

// Маршрут для загрузки изображений галереи
router.post('/gallery/:perfumeId', uploadGalleryImages); // Загрузка изображений в галерею
router.get('/gallery/:perfumeId', getGalleryImages); // Получение изображений галереи

// Маршрут для получения парфюмов по нескольким ID
router.post('/by-ids', getPerfumesByIds); // Получение парфюмов по нескольким ID

// Маршрут для перевода и обновления всех полей
router.put('/translate-all', translateAndUpdateAllFields); // Перевод и обновление всех полей

// Общие маршруты для всех парфюмов
router.get('/', getAllPerfumes); // Получение всех парфюмов
router.post('/', createPerfume); // Создание нового парфюма

// Универсальные маршруты (в конце для предотвращения конфликтов)
router.get('/:perfume_id', getPerfumeById); // Получение парфюма по ID
router.put('/:id', updatePerfume); // Обновление парфюма по ID
router.delete('/:id', deletePerfume); // Удаление парфюма по ID

export default router;
