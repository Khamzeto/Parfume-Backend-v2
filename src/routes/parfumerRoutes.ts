import express from 'express';
import { getAllParfumers, getParfumersByInitial, getPerfumesByParfumer } from '../controllers/parfumerController';

const router = express.Router();

// Define the route for getting all parfumers
router.get('/', getAllParfumers);
router.get('/parfumers/:initial', getParfumersByInitial);
router.get('/perfumes', getPerfumesByParfumer);

export default router;
