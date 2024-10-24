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
} from '../controllers/perfumeController';

const router = express.Router();

// Define specific routes first
router.get('/search', searchPerfumes); // Search perfumes
router.get('/searchBrands', searchBrands); // Search brands
router.get('/similar', getPerfumesWithSimilarAndSearch); // Get perfumes with similar perfumes

// Route for uploading gallery images
router.post('/gallery/:perfumeId', uploadGalleryImages);
router.get('/gallery/:perfumeId', getGalleryImages); // Get gallery images

// Route to retrieve perfumes by multiple IDs
router.post('/by-ids', getPerfumesByIds);

// Route for translating and updating all fields
router.put('/translate-all', translateAndUpdateAllFields);

// General routes for all perfumes
router.get('/', getAllPerfumes); // Get all perfumes
router.post('/', createPerfume); // Create new perfume

// Generic routes last (to prevent conflicts)
router.get('/:perfume_id', getPerfumeById); // Get perfume by ID
router.put('/:id', updatePerfume); // Update perfume by ID
router.delete('/:id', deletePerfume); // Delete perfume by ID

export default router;
