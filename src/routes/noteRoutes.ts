import { Router } from 'express';
import { extractAndSaveNotes, getAllNotes, getNotesByInitial, getPerfumesByNote, searchNotes } from '../controllers/noteController';

const router = Router();

router.get('/', extractAndSaveNotes);
router.get('/all-notes', getAllNotes);
router.get('/initial/:initial', getNotesByInitial);
router.get('/perfumes', getPerfumesByNote);
router.get('/search', searchNotes);
export default router;
