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
} from '../controllers/perfumeController';

const router = express.Router();
router.put('/translate-all', translateAndUpdateAllFields);

router.get('/', getAllPerfumes);
router.get('/search', searchPerfumes);
router.get('/searchBrands', searchBrands);
router.get('/:perfume_id', getPerfumeById);
router.post('/', createPerfume);
router.put('/:id', updatePerfume);
router.delete('/:id', deletePerfume);

export default router;
