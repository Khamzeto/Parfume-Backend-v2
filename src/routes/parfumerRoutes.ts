import express from 'express';
import { addParfumer, deleteParfumerById, getAllParfumers, getParfumerById, getParfumersByInitial, getPerfumesByParfumer, searchParfumers, updateParfumer} from '../controllers/parfumerController';

const router = express.Router();

// Define the route for getting all parfumers
router.get('/', getAllParfumers);
router.get('/parfumers/:initial', getParfumersByInitial);
router.get('/perfumes', getPerfumesByParfumer);
router.put('/parfumers/:id', updateParfumer);
router.post('/parfumers', addParfumer);
router.get('/search', searchParfumers);

// Удалить парфюмера по ID
router.delete('/parfumers/:id', deleteParfumerById);
router.get('/parfumers/id/:id', getParfumerById);

export default router;
