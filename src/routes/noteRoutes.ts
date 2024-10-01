import { Router } from 'express';
import {
  extractAndSaveNotes,
  getAllNotes,
  getNotesByInitial,
  getPerfumesByNote,
  searchNotes,
  updateNote,      // Импортируем функцию обновления ноты
  deleteNote,       // Импортируем функцию удаления ноты
  getNoteById,
  addNote
} from '../controllers/noteController';

const router = Router();

router.get('/', extractAndSaveNotes);
router.get('/all-notes', getAllNotes);
router.get('/initial/:initial', getNotesByInitial);
router.get('/perfumes', getPerfumesByNote);
router.get('/search', searchNotes);
router.get('/:noteId', getNoteById);     // Маршрут для получения ноты по ID
router.post('/', addNote); 

// Добавляем маршруты для обновления и удаления нот
router.put('/:noteId', updateNote);  // Маршрут для обновления ноты (PUT запрос)
router.delete('/:noteId', deleteNote); // Маршрут для удаления ноты (DELETE запрос)

export default router;