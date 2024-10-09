// /src/routes/perfumeRoutes.ts
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
} from '../controllers/perfumeController';

const router = express.Router();
router.put('/translate-all', translateAndUpdateAllFields);

router.get('/', getAllPerfumes);
router.get('/search', searchPerfumes);
router.get('/searchBrands', searchBrands);
router.get('/:perfume_id', getPerfumeById);
router.post('/gallery/:perfumeId', uploadGalleryImages);
router.post('/by-ids', getPerfumesByIds);
// Роут для получения галереи изображений
router.get('/gallery/:perfumeId', getGalleryImages);
router.post('/', createPerfume);
router.put('/:id', updatePerfume);
router.delete('/:id', deletePerfume);

export default router;
