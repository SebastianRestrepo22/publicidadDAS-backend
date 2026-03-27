import { Router } from 'express';
import { getColores, getColoresProducto, updateColoresProducto } from '../controllers/color.controller.js';

const router = Router();

router.get('/', getColores);
router.get('/producto/:id', getColoresProducto);     
router.post('/producto/:id', updateColoresProducto);  

export default router;