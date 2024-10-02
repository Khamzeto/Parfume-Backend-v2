import express from 'express';
import { addParfumer, deleteParfumerById, getAllParfumers, getParfumersByInitial, getPerfumesByParfumer, updateParfumer} from '../controllers/parfumerController';

const router = express.Router();

// Define the route for getting all parfumers
router.get('/', getAllParfumers);
router.get('/parfumers/:initial', getParfumersByInitial);
router.get('/perfumes', getPerfumesByParfumer);
router.put('/parfumers/:id', updateParfumer);
router.post('/parfumers', addParfumer);

// Удалить парфюмера по ID
router.delete('/parfumers/:id', deleteParfumerById);

export default router;
