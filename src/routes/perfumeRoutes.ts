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
  addReview,
  addCategoryRatings,
  getRecentReviews,
  getAllReviews, // Импортируем функцию для добавления отзыва
} from '../controllers/perfumeController';

const router = express.Router();

// Define specific routes first
router.get('/search', searchPerfumes); // Search perfumes
router.get('/searchBrands', searchBrands); // Search brands
router.get('/similar', getPerfumesWithSimilarAndSearch); // Get perfumes with similar perfumes
router.get('/recent', getRecentPerfumes);

// Route for uploading gallery images
router.post('/gallery/:perfumeId', uploadGalleryImages);
router.get('/gallery/:perfumeId', getGalleryImages); // Get gallery images
router.post('/perfumes/:perfume_id/rating', addCategoryRatings);
// Route to retrieve perfumes by multiple IDs
router.post('/by-ids', getPerfumesByIds);

// Route for translating and updating all fields
router.put('/translate-all', translateAndUpdateAllFields);

// General routes for all perfumes
router.get('/', getAllPerfumes); // Get all perfumes
router.post('/', createPerfume); // Create new perfume

// Route for adding a review
router.post('/:perfume_id/reviews', addReview); // Добавляем маршрут для добавления отзыва

// Generic routes last (to prevent conflicts)
router.get('/:perfume_id', getPerfumeById); // Get perfume by ID
router.put('/:id', updatePerfume); // Update perfume by ID
router.delete('/:id', deletePerfume); // Delete perfume by ID
router.get('/reviews/recent', getRecentReviews);
router.get('/reviews/all', getAllReviews);
export default router;
